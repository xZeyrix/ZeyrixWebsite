"use client";

import LikeIcon from "@/src/icons/like.svg";
import ErrorIcon from "@/src/icons/warning.svg";
import ArrowIcon from "@/src/icons/arrowBasic.svg";
import RetryIcon from "@/src/icons/retry.svg";
import RedactIcon from "@/src/icons/redact.svg";

import { MessageAttachment } from "./Attachment";
import {
  Message,
  Attachment,
} from "@/src/types/chat";

import { useState, useEffect, SetStateAction } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/src/lib/date-fns-locale";
import { MarkdownMessage } from "./MarkdownMessage";
import { CopyButton } from "./Buttons";
import { Step } from "./AgentStep";
import { ApprovalCard } from "./ApprovalCard";
import { _Translator } from "next-intl";
import { useConnection } from "../auth/ConnectionContext";

function formatMessageTime(dateString: string): string {
  const t = useTranslations("message");
  const locale = useLocale();
  const dfLocale = getDateFnsLocale(locale);

  const date = new Date(dateString);
  const now = new Date();

  const isThisYear = date.getFullYear() === now.getFullYear();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday = date.toDateString() === yesterday.toDateString();

  const formatted = isThisYear
    ? format(date, `d MMM, HH:mm`, { locale: dfLocale })
    : format(date, `d MMM, yyyy, HH:mm`, { locale: dfLocale });
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (isToday) {
    return `${t("today")}, ${time}`;
  }

  if (isYesterday) {
    return `${t("yesterday")}, ${time}`;
  }

  return formatted;
}

function UserMessage({
  id,
  attachments,
  text,
  time,
  status,
  notSent,
  retrySendMessage,
  setShouldScroll,
}: {
  id: string;
  attachments: Attachment[] | undefined;
  text: string;
  time: string;
  status: "pending" | "completed" | "error" | "approval_required" | "cancelled";
  notSent?: boolean;
  retrySendMessage?: (
    id: string,
    prompt: string,
    attachments: Attachment[],
    deleteFromLocal: boolean,
  ) => void;
  setShouldScroll?: (value: SetStateAction<boolean>) => void;
}) {
  const t = useTranslations("userMessage");
  const { access } = useConnection();

  return (
    <div className="flex flex-col items-end">
      <div className="bg-primary px-4 py-3 rounded-t-[20px] rounded-bl-[20px] rounded-br-sm max-w-[70%]">
        {attachments && attachments.length === 0 ? (
          <></>
        ) : (
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-thin overflow-y-hidden">
            {attachments?.map((attachment) => (
              <MessageAttachment key={attachment.fileId} {...attachment} />
            ))}
          </div>
        )}

        <p className="font-sans text-body text-background whitespace-pre-line">
          {text}
        </p>

        <p className="mt-1 text-right font-sans text-caption text-background/70">
          {time}
        </p>
      </div>

      {status === "error" && (
        <div className="mt-1.5 flex flex-col items-end gap-2 text-caption">
          <div className="flex items-center gap-1 text-error">
            <ErrorIcon className="size-3.5 shrink-0" />
            <p>{notSent ? t("notSent") : t("notTransmitted")}</p>
          </div>

          {/* <button
              className="
                flex items-center gap-2
                text-foreground-secondary
                hover:text-foreground hover:cursor-pointer
                transition-colors
              "
              onClick={() => {
                
              }}
            >
              <RedactIcon className="size-3.5" />
              <span>Редактировать</span>
          </button> */}

          {retrySendMessage && (
            <button
              className={`
                flex items-center gap-2
                ${access === "disabled" ? "text-foreground-muted/90" : "text-foreground-secondary hover:text-foreground hover:cursor-pointer"}
                transition-colors
              `}
              disabled={access === "disabled"}
              onClick={() => {
                retrySendMessage(id, text, attachments || [], notSent || false);

                if (setShouldScroll) {
                  setShouldScroll(true);
                }
              }}
            >
              <RetryIcon className="size-3.5" />
              <p>{t("tryAgain")}</p>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function adaptText(text: string, status: string, t: _Translator<Record<string, any>>): [string, string | null] {
  if (status !== "error") {
    return [text, null];
  }

  function generateContactUrl(errorCode: string, statusCode: string, requestId: string): string {
    const reportSubject = t("unknownErrorReportSubject")
    const reportBody = t("unknownErrorReportBody", {
      "errorCode": errorCode,
      "statusCode": statusCode,
      "requestId": requestId,
    });

    const contactUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent("support@zeyrix.co")}` +
      `&su=${encodeURIComponent(reportSubject)}` +
      `&body=${encodeURIComponent(reportBody)}`;
    
    return contactUrl;
  }

  try {
    const parsedText = JSON.parse(text);
    
    const errorCode = parsedText["error_code"];
    const statusCode = parsedText["status_code"];
    const requestId = parsedText["request_id"];
    const contactUrl = generateContactUrl(errorCode, statusCode, requestId);

    const systemMessage = () => {
      if (errorCode === "CLIENT_DISCONNECTED") {
        return t("clientDisconnected");
      } else {
        return t("unknownError", {
          "errorCode": errorCode,
          "statusCode": statusCode,
          "requestId": requestId,
          "url": contactUrl,
        });
      }
    };

    return [systemMessage(), errorCode];

  } catch(error) {
    const errorCode = "INVALID_ERROR_MESSAGE_STRUCTURE";
    const contactUrl = generateContactUrl(errorCode, "null", "null");

    return [t("unknownError", {
      "errorCode": errorCode,
      "statusCode": "null",
      "requestId": "null",
      "url": contactUrl,
    }), errorCode];
  }
}

function formatDuration(ms: number, t: _Translator<Record<string, any>>): string {
  const seconds = Math.round(ms / 1000);

  if (seconds < 60) {
    return `${seconds}${t("s")}`;
  }

  const minutes = Math.round(seconds / 60);
  const restSeconds = seconds % 60;

  return `${minutes}${t("m")} ${restSeconds}${t("s")}`;
}

function useElapsedTime(startDate: string | Date): number {
  const [elapsed, setElapsed] = useState(() => {
    return Date.now() - new Date(startDate).getTime();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(startDate).getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [startDate]);

  return elapsed;
}

export function MessageBubble({
  applyToolUse,
  retrySendMessage,
  setShouldScroll,
  notSent,
  role,
  status,
  text,
  attachments,
  steps,
  createdAt,
  processingSeconds,
  id,
}: Message) {
  const t = useTranslations("agentSteps");
  const system_messages_t = useTranslations("systemMessages");

  const time = formatMessageTime(createdAt);
  const [isStepsExtended, setIsStepsExtended] = useState(
    status === "pending",
  );
  const approvalDetails = steps?.at(-1)?.approvalDetails;
  steps = steps ? steps : [];

  const elapsedTime = useElapsedTime(createdAt);
  const workDuration = formatDuration(
    processingSeconds ? processingSeconds : elapsedTime, t
  );
  const workedFor = processingSeconds
    ? formatDuration(processingSeconds * 1000, t)
    : "-";

  const [adaptedText, errorCode] = adaptText(text, status, system_messages_t);

  switch (role) {
    case "user":
      return <UserMessage attachments={attachments} text={text} time={time} status={status} retrySendMessage={retrySendMessage} id={id} notSent={notSent} setShouldScroll={setShouldScroll} />;

    case "assistant":
      return (
        <div className="flex justify-start min-w-0">
          <div className={`
            py-3 rounded-t-[20px] rounded-br-[20px] rounded-bl-sm w-full flex flex-col gap-1 min-w-0
            ${status === "error" && "border pl-5"}
            ${status === "error" && errorCode === "CLIENT_DISCONNECTED" ? "border-info" : "border-error"}
          `}>
            <div className="flex flex-col gap-2">
              <div
                className={`
                    flex flex-row items-center gap-2 w-fit text-foreground-muted
                    ${steps.length > 0 && "hover:cursor-pointer hover:text-foreground-secondary"}
                `}
                onClick={() => setIsStepsExtended((prev) => !prev)}
              >
                {status === "pending" ? (
                  <p className="text-caption">
                    {t("working")} {workDuration}
                  </p>
                ) : status === "approval_required" ? (
                  <p className="text-caption">{t("awaiting")}</p>
                ) : status === "cancelled" ? (
                  <p className="text-caption">{t("cancelled")}</p>
                ) : (
                  <p className="text-caption">
                    {t("worked")} {workedFor}
                  </p>
                )}
                <ArrowIcon
                  className={`size-2 ${isStepsExtended && "rotate-90"} ${steps.length === 0 && "hidden"}`}
                />
              </div>

              <div
                className={`
                    flex flex-col relative
                    overflow-hidden
                    ${
                      isStepsExtended
                        ? "max-h-250 opacity-100 transition-all duration-300 ease-out"
                        : "max-h-0 opacity-0 transition-[max-height] duration-100"
                    }
                `}
              >
                {steps.map((step, index) => (
                  <Step
                    key={step.id}
                    {...step}
                    isLast={index === steps.length - 1}
                  />
                ))}
              </div>
            </div>

            {text && <MarkdownMessage text={adaptedText} />}

            {attachments && attachments.length > 0 && (
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-thin overflow-y-hidden">
                {attachments.map((attachment) => (
                  <MessageAttachment key={attachment.fileId} {...attachment} />
                ))}
              </div>
            )}

            {status === "completed" && (
              <div className="flex flex-row items-center">
                <CopyButton content={adaptedText} />
                <button className="p-2 rounded-lg hover:bg-elevated hover:cursor-pointer">
                  <LikeIcon className="text-foreground size-4" />
                </button>
                <button className="p-2 rounded-lg hover:bg-elevated hover:cursor-pointer">
                  <LikeIcon className="text-foreground size-4 scale-y-[-1]" />
                </button>
              </div>
            )}

            {status === "approval_required" && (
              <ApprovalCard
                approvalDetails={approvalDetails}
                applyToolUse={applyToolUse}
              />
            )}
          </div>
        </div>
      );
  }
}
