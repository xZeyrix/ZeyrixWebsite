"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "./Buttons";

type Props = {
  text: string;
};

export const MarkdownMessage = memo(function MarkdownMessage({ text }: Props) {
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

  return (
    <div
      className="font-sans text-body text-foreground max-w-none min-w-0"
      style={{ userSelect: "text", WebkitUserSelect: "text" }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
