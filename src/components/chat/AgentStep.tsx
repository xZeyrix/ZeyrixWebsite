import AwaitingIcon from "@/src/icons/time.svg";
import ToolIcon from "@/src/icons/tool.svg";
import ArrowIcon from "@/src/icons/arrowBasic.svg";
import CloseIcon from "@/src/icons/close.svg";
import WarningIcon from "@/src/icons/warning.svg";
import SearchIcon from "@/src/icons/search.svg";
import DatabaseIcon from "@/src/icons/database.svg";
import GenImageIcon from "@/src/icons/gen_image.svg";
import GenDocxIcon from "@/src/icons/gen_docx.svg";
import GenExcelIcon from "@/src/icons/gen_excel.svg";

import { AgentStep, ToolDetails, StepKind, StepStatus, FailedGeneration } from "@/src/types/chat";
import { useStep } from "@/src/hooks/useStep";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MarkdownMessage } from "./MarkdownMessage";

function formatFailedArguments(raw: string | undefined, t: (key: string) => string): string {
  if (!raw) return t("noParams");

  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function StepOverlay(
  { kind, status, toolName, toolDetails, failedGeneration, onClose }: 
  { kind: StepKind, status: StepStatus, toolName?: string, toolDetails?: ToolDetails, failedGeneration?: FailedGeneration, onClose: () => void }
) {
  const t = useTranslations("stepOverlay")

  const { error, undoTool } = useStep()
  const [isUndone, setIsUndone] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  return (
    <div
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/90 cursor-auto p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-110 bg-surface rounded-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="absolute top-0 right-0 p-4 hover:cursor-pointer bg-surface rounded-2xl"
          onClick={onClose}
        >
          <CloseIcon className="size-3 text-foreground-muted" />
        </div>

        {kind === "tool_call" ? (
          <>
          <div className="flex flex-col w-fit items-start p-3">
            <div className="flex flex-row  text-foreground gap-1 min-w-0 w-full items-center">
              <ToolIcon className="size-4" />
              <h4 className="text-h4 truncate min-w-0 flex-1">{t("toolTitle", { toolName: toolName ?? t("unknown") })}</h4>
            </div>
            <p 
              className={`
                text-caption
                ${status === "in_progress" ? "text-foreground-secondary"
                  : status === "done" ? "text-success"
                  : status === "awaiting_approval" ? "text-warning"
                  : "text-error"
                }
              `}
            >
              {t(status)}
            </p>
          </div>

          {toolDetails ? (
            <div className="p-6 flex flex-col gap-10">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <h4 className="text-h4 text-foreground-secondary">{t("paramsPreview")}</h4>
                  <div className="bg-background rounded-md p-3 text-caption font-mono">
                    <pre className="whitespace-pre-wrap break-all max-h-50 overflow-y-auto">
                      {toolDetails.arguments ? JSON.stringify(JSON.parse(toolDetails.arguments), null, 2) : t("noParams")}
                    </pre>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h4 className="text-h4 text-foreground-secondary">{t("result")}</h4>
                  <div className="bg-background rounded-md p-3 text-caption font-mono">
                    <pre className="whitespace-pre-wrap break-all m-0 max-h-30 overflow-y-auto">
                      {typeof toolDetails.rowsAffected === "number" ? t("rowsAffected", { rows: toolDetails.rowsAffected })
                      : status === "in_progress" ? t("inProgress")
                      : status === "error" ? t("errorResult")
                      : status === "denied" ? t("deniedResult")
                      : status === "forbidden" ? t("forbiddenResult")
                      : toolName === "get_all_tables" ? t("getAllTablesResult")
                      : toolName === "get_table_structure" ? t("getTableStructureResult")
                      : t("unknownResult")
                      }
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button 
                  className={`
                    w-full py-3 rounded-lg text-background bg-primary 
                    ${["delete", "update", "insert"].includes(toolName ?? "") && toolDetails.auditLogId && !isUndone && !isUndoing ? "hover:cursor-pointer hover:bg-primary-hover" : "opacity-50"}
                    ${isUndoing && "bg-primary-active"}
                  `}
                  disabled={!["delete", "update", "insert"].includes(toolName ?? "") || !toolDetails.auditLogId || isUndone || isUndoing}
                  onClick={async () => {
                    if (toolDetails.auditLogId) {
                      try {
                        setIsUndoing(true);
                        await undoTool(toolDetails.auditLogId, setIsUndone);
                      } catch {

                      } finally {
                        setIsUndoing(false);
                      }
                    }
                  }}
                >
                  {isUndone ? t("buttonUndone") : isUndoing ? t("buttonUndoing") : t("buttonUndo")}
                </button>
                <p className="text-caption text-error">{error}</p>
              </div>
            </div>
          ) : failedGeneration ? (
            <div className="p-6 flex flex-col gap-5">
              <div className="flex items-start gap-2 rounded-md bg-error/10 border border-error/30 p-3">
                <WarningIcon className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <p className="text-caption text-error">{t("failedGenerationNotice")}</p>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="text-h4 text-foreground-secondary">{t("attemptedTool")}</h4>
                <div className="bg-background rounded-md p-3 text-caption font-mono">
                  <pre className="whitespace-pre-wrap break-all m-0">
                    {failedGeneration.name || t("unknownTool")}
                  </pre>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="text-h4 text-foreground-secondary">{t("attemptedParams")}</h4>
                <div className="bg-background rounded-md p-3 text-caption font-mono">
                  <pre className="whitespace-pre-wrap break-all max-h-50 overflow-y-auto m-0">
                    {formatFailedArguments(failedGeneration.arguments, t)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3">
              <p className="text-body text-foreground-secondary">{t("emptyTool")}</p>
            </div>
          )}
          </>
        ) : (
          <div>
            <p>{t("emptyStep")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function Step({ kind, status, toolName, isLast, toolDetails, failedGeneration, label, isNextReasoning }: AgentStep) {
  const t = useTranslations("agentSteps");
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  if (kind === "reasoning") {
    return (
      <div className="pb-3 text-foreground">
        <MarkdownMessage text={label} />
      </div>
    );
  }

  const colorClass =
    status === "in_progress" || status === "awaiting_approval"
      ? "text-foreground-secondary"
      : status === "done"
        ? "text-foreground-muted"
        : "text-[#ff8686]";

  const localizedLabel = () => {
    const personalizedKey = `${toolName}_${status}`;
    const fallbackKey = `${kind}_${status}`;

    if (t.has(personalizedKey)) {
      return t(personalizedKey, {
        rows: toolDetails?.rowsAffected ?? "",
        table: toolDetails?.tableName ?? "",
      });
    }

    return t(fallbackKey, {
      toolName: toolName ?? t("unknown_tool"),
    });
  };

  const isInteractive = kind === "tool_call" && status !== "awaiting_approval";

  return (
    <>
    <button
      className={`flex gap-2 items-start ${colorClass} ${isInteractive && 'hover:cursor-pointer group'} max-w-70`}
      onClick={() => isInteractive && setIsOverlayOpen((prev) => !prev)}
    >
      <div className="relative flex w-3 shrink-0 flex-col items-center self-stretch">
        <div className="relative z-10 mt-1 flex size-3 shrink-0 items-center justify-center bg-surface">
          {(["web_search", "fetch_webpage"].includes(toolName || "")) ? (
            <SearchIcon className="size-4" />
          ) : (["get_table_structure", "select", "update", "delete", "insert"].includes(toolName || "")) ? (
            <DatabaseIcon className="size-4" />
          ) : toolName === "generate_image" ? (
            <GenImageIcon className="size-4" />
          ) : toolName === "generate_docx" ? (
            <GenDocxIcon className="size-4" />
          ) : toolName === "generate_excel" ? (
            <GenExcelIcon className="size-4" />
          ) : (
            <ToolIcon className="size-3" />
          )}
        </div>

        {(!isLast && !isNextReasoning) && <div className="w-0.5 flex-1 -mb-1 bg-foreground-muted" />}
      </div>
      
      <div className="flex w-full items-center justify-between gap-2 min-w-0">
        <p
          className={`text-body-sm min-w-0 flex-1 truncate pb-2 text-start group-hover:underline ${
            status === "in_progress" ? "animate-pulse" : ""
          }`}
        >
          {localizedLabel()}
        </p>
        
        <div className={`pb-2 ${!isInteractive && "hidden"}`}>
          <ArrowIcon className="size-2 shrink-0" />
        </div>
      </div>
    </button>

    {isOverlayOpen && 
      <StepOverlay kind={kind} status={status} toolName={toolName} toolDetails={toolDetails} failedGeneration={failedGeneration} onClose={() => setIsOverlayOpen(false)} />
    }
    </>
  );
}