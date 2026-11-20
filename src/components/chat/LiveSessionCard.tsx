"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import WaveformIcon from "@/src/icons/waveform.svg";
import ArrowIcon from "@/src/icons/arrowBasic.svg";
import {
  LiveSessionObject,
  LiveSessionStatus,
  Message,
} from "@/src/types/chat";
import { MarkdownMessage } from "./MarkdownMessage";
import { MessageBubble } from "./MessageBubble";

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function statusTone(status: LiveSessionStatus): string {
  switch (status) {
    case "active":
      return "bg-primary/15 text-primary";
    case "ended":
      return "bg-elevated text-foreground-secondary";
    case "error":
      return "bg-danger/15 text-danger";
    case "interrupted":
    case "cancelled":
      return "bg-elevated text-foreground-muted";
    default:
      return "bg-elevated text-foreground-secondary";
  }
}

type LiveSessionCardProps = {
  session: LiveSessionObject;
  applyToolUse?: (
    requestId: string,
    action: "confirm" | "reject",
  ) => Promise<void>;
};

export function LiveSessionCard({
  session,
  applyToolUse,
}: LiveSessionCardProps) {
  const t = useTranslations("liveSession");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    session.transcription.length > 0 || session.conversation.length > 0;

  const statusLabel = t(`status.${session.status}` as "status.ended");

  const timeLabel = (() => {
    try {
      return new Date(session.createdAt).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  })();

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-190 rounded-2xl border border-border bg-surface overflow-hidden">
        <button
          type="button"
          onClick={() => hasDetails && setExpanded((v) => !v)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
            hasDetails ? "hover:bg-elevated/60 hover:cursor-pointer" : ""
          }`}
          aria-expanded={expanded}
        >
          <div className="size-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <WaveformIcon className="size-4 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-body font-medium text-foreground">
                {t("title")}
              </span>
              <span
                className={`text-caption px-2 py-0.5 rounded-full ${statusTone(
                  session.status,
                )}`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="text-caption text-foreground-muted mt-0.5">
              {formatDuration(session.durationSeconds)}
              {timeLabel ? ` · ${timeLabel}` : ""}
              {session.transcription.length > 0
                ? ` · ${t("turns", { count: session.transcription.length })}`
                : ""}
            </p>
          </div>

          {hasDetails && (
            <ArrowIcon
              className={`size-4 text-foreground-muted shrink-0 transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
            />
          )}
        </button>

        {expanded && hasDetails && (
          <div className="border-t border-border px-4 py-3 flex flex-col">
            {session.transcription.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-caption font-medium text-foreground-secondary">
                  {t("transcript")}
                </p>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                  {session.transcription.map((turn, idx) => {
                    const isUser = turn.role === "user";
                    return (
                      <div
                        key={`${session.id}-t-${idx}`}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-2xl px-3 py-2 text-body ${
                            isUser
                              ? "bg-primary text-background rounded-tr-sm"
                              : "bg-elevated text-foreground rounded-tl-sm"
                          }`}
                        >
                          <p className="text-caption opacity-70 mb-0.5">
                            {isUser ? t("you") : t("agent")}
                          </p>
                          <p className="whitespace-pre-wrap wrap-break-word">
                            {turn.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {session.conversation.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-2">
                <p className="text-caption font-medium text-foreground-secondary">
                  {t("internalConversation")}
                </p>
                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                  {session.conversation.map((msg) => (
                    <InternalMessage
                      key={msg.id}
                      message={msg}
                      applyToolUse={applyToolUse}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InternalMessage({
  message,
  applyToolUse,
}: {
  message: Message;
  applyToolUse?: (
    requestId: string,
    action: "confirm" | "reject",
  ) => Promise<void>;
}) {
  const t = useTranslations("liveSession");

  if (message.role === "live_agent") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[95%] rounded-2xl rounded-tr-sm bg-elevated px-3 py-2 border border-border">
          <p className="text-caption text-foreground-muted mb-1">
            {t("liveAgent")}
          </p>
          <div className="text-body text-foreground">
            <MarkdownMessage text={message.text || ""} />
          </div>
        </div>
      </div>
    );
  }

  // Prefer full bubble for assistant (steps / approvals) when handlers exist
  if (applyToolUse && (message.steps?.length || message.status === "approval_required")) {
    return (
      <MessageBubble
        {...message}
        applyToolUse={applyToolUse}
      />
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-surface border border-border px-3 py-2">
        <p className="text-caption text-foreground-muted mb-1">{t("mainAgent")}</p>
        <div className="text-body text-foreground">
          <MarkdownMessage text={message.text || ""} />
        </div>
      </div>
    </div>
  );
}
