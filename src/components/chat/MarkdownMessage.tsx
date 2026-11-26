"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "./Buttons";

type Props = {
  text: string;
  /** When true, incomplete markdown tokens are closed so the parser does not
   *  swallow the trailing half of a streaming line until the response is done. */
  streaming?: boolean;
};

/**
 * Soft-close / repair constructs that break remark + remark-gfm mid-stream.
 *
 * Without this, incomplete tables / fences / emphasis often make the parser
 * reinterpret the whole tail of the document so newly streamed tokens stop
 * appearing until the response is complete.
 *
 * Strategy (common in streaming MD UIs):
 * 1. Close unbalanced inline/fence markers so the tail stays visible.
 * 2. Repair partial GFM tables (header without separator, short rows, missing
 *    trailing pipes) so remark-gfm keeps rendering a table progressively.
 * 3. Never drop already-received text — only append synthetic closers.
 */
export function stabilizeStreamingMarkdown(raw: string): string {
  if (!raw) return raw;

  let text = raw;

  // --- 1. Fenced code blocks (``` or ~~~) ---
  // Count fence lines outside of already-closed pairs; odd => still open.
  {
    const fenceLineRegex = /^ {0,3}([`~]{3,})(.*)$/gm;
    const fences: { ch: string; len: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = fenceLineRegex.exec(text)) !== null) {
      const ch = m[1][0]!;
      const len = m[1].length;
      const top = fences[fences.length - 1];
      if (top && top.ch === ch && len >= top.len) {
        fences.pop();
      } else {
        fences.push({ ch, len });
      }
    }
    if (fences.length > 0) {
      const top = fences[fences.length - 1]!;
      if (!text.endsWith("\n")) text += "\n";
      text += top.ch.repeat(Math.max(3, top.len));
    }
  }

  // --- 2. GFM tables (the usual freeze culprit) ---
  text = repairStreamingTables(text);

  // --- 3. Incomplete markdown links ---
  text = text.replace(/\[([^\]]*)\]\(([^)\n]*)$/g, (_full, label, url) => {
    return url ? `${label} (${url})` : label;
  });
  text = text.replace(/\[([^\]]*)$/g, "$1");

  // --- 4. Unbalanced inline code ` ---
  {
    const withoutFences = text.replace(/```[\s\S]*?```/g, (b) =>
      " ".repeat(b.length),
    );
    const singleTicks = (withoutFences.match(/(?<!`)`(?!`)/g) || []).length;
    if (singleTicks % 2 === 1) text += "`";
  }

  // --- 5. Bold / italic / underline markers ---
  const maskCode = (s: string) =>
    s
      .replace(/```[\s\S]*?```/g, (b) => " ".repeat(b.length))
      .replace(/`[^`\n]*`/g, (b) => " ".repeat(b.length));

  {
    const masked = maskCode(text);
    if ((masked.match(/\*\*/g)?.length ?? 0) % 2 === 1) text += "**";
    const italicMasked = maskCode(text).replace(/\*\*/g, "  ");
    if ((italicMasked.match(/\*/g)?.length ?? 0) % 2 === 1) text += "*";
    if ((maskCode(text).match(/__/g)?.length ?? 0) % 2 === 1) text += "__";
    const underItalic = maskCode(text)
      .replace(/__/g, "  ")
      .match(/_/g)?.length ?? 0;
    if (underItalic % 2 === 1) text += "_";
    // ~~strikethrough
    if ((maskCode(text).match(/~~/g)?.length ?? 0) % 2 === 1) text += "~~";
  }

  // --- 6. Incomplete list / heading trailing line stays visible ---
  // Ensure document ends with newline so GFM block parsers finalize the last line.
  if (text.length > 0 && !text.endsWith("\n")) {
    text += "\n";
  }

  return text;
}

const TABLE_ROW_RE = /^ {0,3}\|.*\|?\s*$/;
const TABLE_SEP_RE =
  /^ {0,3}\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/;

function countTableCells(line: string): number {
  // Split on |, drop leading/trailing empties from outer pipes
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|")) body = body.slice(0, -1);
  if (!body.trim()) return 0;
  return body.split("|").length;
}

function isSeparatorLine(line: string): boolean {
  return TABLE_SEP_RE.test(line);
}

function isTableLikeLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  // Must contain a pipe and look like a row (not a plain sentence with one |)
  if (!t.includes("|")) return false;
  return TABLE_ROW_RE.test(line) || isSeparatorLine(line) || /^\s*\|/.test(line);
}

function makeSeparator(cols: number): string {
  if (cols <= 0) cols = 1;
  return `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
}

function padTableRow(line: string, cols: number): string {
  let body = line.trim();
  const hadLeading = body.startsWith("|");
  const hadTrailing = body.endsWith("|");
  if (hadLeading) body = body.slice(1);
  if (hadTrailing) body = body.slice(0, -1);
  const cells = body.split("|").map((c) => c.trim());
  while (cells.length < cols) cells.push("");
  // Keep extra cells if model sent more — GFM tolerates overflow better than underflow mid-stream
  return `| ${cells.join(" | ")} |`;
}

/**
 * Repair a trailing (possibly incomplete) GFM table so remark-gfm can parse it
 * while tokens are still arriving.
 */
function repairStreamingTables(src: string): string {
  const lines = src.split("\n");
  if (lines.length === 0) return src;

  // Find the longest trailing run of table-like lines (allow one blank at very end)
  let end = lines.length - 1;
  // drop trailing empty line from consideration but keep it in output
  const trailingEmpty = lines[end] === "";
  if (trailingEmpty && end > 0) end -= 1;

  let start = end;
  while (start >= 0 && isTableLikeLine(lines[start]!)) {
    start -= 1;
  }
  start += 1;

  if (start > end) return src; // no table-like trailing block

  // Prefer starting at a line that looks like a real header (has pipes, not only dashes)
  // Walk forward to first non-separator table line
  while (start <= end && isSeparatorLine(lines[start]!)) {
    start += 1;
  }
  if (start > end) return src;

  const block = lines.slice(start, end + 1);
  if (block.length === 0) return src;

  const header = block[0]!;
  if (!header.includes("|")) return src;

  const cols = Math.max(1, countTableCells(header));
  const repaired: string[] = [padTableRow(header, cols)];

  let i = 1;
  if (i < block.length && isSeparatorLine(block[i]!)) {
    // Normalize separator to header width
    repaired.push(makeSeparator(cols));
    i += 1;
  } else {
    // Header without separator — inject one so GFM treats this as a table
    // instead of a pipe-paragraph that can swallow following text.
    repaired.push(makeSeparator(cols));
  }

  for (; i < block.length; i++) {
    const row = block[i]!;
    if (isSeparatorLine(row)) {
      // Extra separator mid-body: keep as normalized separator
      repaired.push(makeSeparator(cols));
      continue;
    }
    repaired.push(padTableRow(row, cols));
  }

  const before = lines.slice(0, start);
  const after = trailingEmpty ? [""] : [];
  // Ensure blank line before table when previous line is prose (GFM tip)
  if (
    before.length > 0 &&
    before[before.length - 1]!.trim() !== "" &&
    !isTableLikeLine(before[before.length - 1]!)
  ) {
    before.push("");
  }

  return [...before, ...repaired, ...after].join("\n");
}

export const MarkdownMessage = memo(function MarkdownMessage({
  text,
  streaming = false,
}: Props) {
  const components = useMemo(
    () => ({
      h1: ({ children }: any) => (
        <h1 className="text-h1 text-foreground mt-6 mb-3 first:mt-0">
          {children}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2 className="text-h2 text-foreground mt-5 mb-2 first:mt-0">
          {children}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3 className="text-h3 text-foreground mt-4 mb-2 first:mt-0">
          {children}
        </h3>
      ),
      h4: ({ children }: any) => (
        <h4 className="text-h4 text-foreground mt-4 mb-1.5 first:mt-0">
          {children}
        </h4>
      ),
      p: ({ children }: any) => (
        <p className="text-body text-foreground my-2 first:mt-0 last:mb-0">
          {children}
        </p>
      ),
      ul: ({ children }: any) => (
        <ul className="my-2 ml-5 list-disc space-y-1 text-body">{children}</ul>
      ),
      ol: ({ children }: any) => (
        <ol className="my-2 ml-5 list-decimal space-y-1 text-body">
          {children}
        </ol>
      ),
      li: ({ children }: any) => (
        <li className="text-body text-foreground leading-[1.65]">{children}</li>
      ),
      a: ({ href, children }: any) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-hover underline-offset-2 hover:underline transition-colors"
        >
          {children}
        </a>
      ),
      strong: ({ children }: any) => (
        <strong className="font-semibold text-foreground">{children}</strong>
      ),
      em: ({ children }: any) => (
        <em className="italic text-foreground-secondary">{children}</em>
      ),
      del: ({ children }: any) => (
        <del className="line-through text-foreground-muted">{children}</del>
      ),
      hr: () => <hr className="my-5 border-border" />,
      blockquote: ({ children }: any) => (
        <blockquote className="my-3 border-l-2 border-primary-outline pl-4 text-foreground-secondary italic">
          {children}
        </blockquote>
      ),

      table: ({ children }: any) => (
        <div
          className="my-4 w-full min-w-0 max-w-full overflow-x-auto rounded-lg border border-border"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
            touchAction: "pan-x pan-y",
          }}
        >
          <table className="w-full min-w-120 border-collapse text-body-sm">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }: any) => (
        <thead className="bg-elevated">{children}</thead>
      ),
      tbody: ({ children }: any) => (
        <tbody className="divide-y divide-border">{children}</tbody>
      ),
      tr: ({ children }: any) => <tr className="border-border">{children}</tr>,
      th: ({ children }: any) => (
        <th className="border-b border-border px-3 py-2.5 text-left font-medium text-foreground whitespace-nowrap">
          {children}
        </th>
      ),
      td: ({ children }: any) => (
        <td className="px-3 py-2.5 text-foreground-secondary border-border">
          {children}
        </td>
      ),

      pre: ({ children }: any) => <>{children}</>,

      code: ({ children, className, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || "");
        const language = match?.[1];
        const isInline = !className;
        const codeText = String(children).replace(/\n$/, "");

        if (isInline) {
          return (
            <code className="rounded-md bg-elevated px-1.5 py-0.5 text-body-sm font-mono text-primary">
              {children}
            </code>
          );
        }

        return (
          <div className="my-3 min-w-0 max-w-full rounded-lg border border-border bg-elevated">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-1.5">
              <span className="text-caption font-medium uppercase tracking-wider text-foreground-muted">
                {language || "code"}
              </span>
              <CopyButton content={codeText} />
            </div>

            <div
              className="w-full min-w-0 max-w-full overflow-x-auto"
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehaviorX: "contain",
                touchAction: "pan-x pan-y",
              }}
            >
              <pre className="m-0 p-4 text-body-sm font-mono text-foreground whitespace-pre">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            </div>
          </div>
        );
      },
    }),
    [],
  );

  const rendered = useMemo(() => {
    if (!streaming) return text;
    return stabilizeStreamingMarkdown(text);
  }, [text, streaming]);

  return (
    <div
      className="font-sans text-body text-foreground max-w-none min-w-0"
      style={{ userSelect: "text", WebkitUserSelect: "text" }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {rendered}
      </ReactMarkdown>
    </div>
  );
});
