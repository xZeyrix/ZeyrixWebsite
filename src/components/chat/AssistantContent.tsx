"use client";

import { useMemo } from "react";
import type { Attachment } from "@/src/types/chat";
import { MarkdownMessage } from "./MarkdownMessage";
import { MessageAttachment } from "./Attachment";

const FILE_TAG_RE = /<file\s+id=["']([0-9a-fA-F-]{36})["']\s*\/>/gi;

type TextSegment = { type: "text"; value: string };
type FilesSegment = { type: "files"; ids: string[] };
export type ContentSegment = TextSegment | FilesSegment;

/**
 * Split assistant text into markdown chunks and inline file groups.
 * Consecutive <file id="…" /> tags with only whitespace between them
 * collapse into one horizontal row.
 */
export function parseFileTags(text: string): ContentSegment[] {
  if (!text) return [];

  const matches: { id: string; start: number; end: number }[] = [];
  const re = new RegExp(FILE_TAG_RE.source, FILE_TAG_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({
      id: m[1]!,
      start: m.index,
      end: m.index + m[0].length,
    });
  }

  if (matches.length === 0) {
    return [{ type: "text", value: text }];
  }

  const segments: ContentSegment[] = [];
  let cursor = 0;
  let i = 0;

  while (i < matches.length) {
    const first = matches[i]!;

    if (first.start > cursor) {
      const raw = text.slice(cursor, first.start);
      // Whitespace-only gap before a file group is not meaningful as text
      if (raw.trim().length > 0) {
        segments.push({ type: "text", value: raw });
      }
    }

    const ids: string[] = [first.id];
    let end = first.end;
    let j = i + 1;
    while (j < matches.length) {
      const next = matches[j]!;
      const between = text.slice(end, next.start);
      if (between.trim().length > 0) break;
      ids.push(next.id);
      end = next.end;
      j += 1;
    }

    segments.push({ type: "files", ids });
    cursor = end;
    i = j;
  }

  if (cursor < text.length) {
    const tail = text.slice(cursor);
    if (tail.trim().length > 0) {
      segments.push({ type: "text", value: tail });
    }
  }

  return segments;
}

/** Strip file tags for copy / plain text */
export function stripFileTags(text: string): string {
  return text
    .replace(FILE_TAG_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function resolveAttachment(
  id: string,
  attachments: Attachment[] | undefined,
): Attachment {
  const found = attachments?.find((a) => a.fileId === id);
  if (found) return found;
  return {
    fileId: id,
    filename: "file",
    mimeType: "application/octet-stream",
    size: 0,
    generated: true,
  };
}

type AssistantContentProps = {
  text: string;
  attachments?: Attachment[];
  streaming?: boolean;
  /** When true, <file> tags / attachments are not rendered (pending / active approval). */
  hideGeneratedFiles?: boolean;
};

/**
 * Renders assistant message body: markdown with inline generated files.
 * File tags are removed from the text flow and replaced with MessageAttachment.
 * Consecutive tags → one horizontal row (same as the classic attachments strip).
 */
export function AssistantContent({
  text,
  attachments,
  streaming = false,
  hideGeneratedFiles = false,
}: AssistantContentProps) {
  const segments = useMemo(() => parseFileTags(text), [text]);

  const inlineIds = useMemo(() => {
    const ids = new Set<string>();
    for (const seg of segments) {
      if (seg.type === "files") {
        for (const id of seg.ids) ids.add(id);
      }
    }
    return ids;
  }, [segments]);

  // Attachments not referenced by inline tags still render at the bottom
  const leftover = useMemo(
    () => (attachments ?? []).filter((a) => !inlineIds.has(a.fileId)),
    [attachments, inlineIds],
  );

  const visibleSegments = hideGeneratedFiles
    ? segments.filter((s) => s.type === "text")
    : segments;
  const visibleLeftover = hideGeneratedFiles ? [] : leftover;

  if (visibleSegments.length === 0 && visibleLeftover.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {visibleSegments.map((seg, index) => {
        if (seg.type === "text") {
          return (
            <MarkdownMessage
              key={`t-${index}`}
              text={seg.value}
              streaming={
                streaming && index === visibleSegments.length - 1
              }
            />
          );
        }

        return (
          <div
            key={`f-${index}-${seg.ids.join("-")}`}
            className="flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-thin overflow-y-hidden"
          >
            {seg.ids.map((id) => (
              <MessageAttachment
                key={id}
                {...resolveAttachment(id, attachments)}
              />
            ))}
          </div>
        );
      })}

      {visibleLeftover.length > 0 && (
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-thin overflow-y-hidden">
          {visibleLeftover.map((attachment) => (
            <MessageAttachment key={attachment.fileId} {...attachment} />
          ))}
        </div>
      )}
    </div>
  );
}
