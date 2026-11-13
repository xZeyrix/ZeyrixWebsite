"use client";

import { useTranslations } from "next-intl";

type TaskActionPanelProps = {
  isTaskRunning?: boolean;
  onCancelTask?: () => void;
  cancelling?: boolean;
};

export function TaskActionPanel({
  isTaskRunning = false,
  onCancelTask,
  cancelling = false,
}: TaskActionPanelProps) {
  const t = useTranslations("taskPanel");

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3">
      <div className="mx-auto flex w-full max-w-190 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-body-sm text-foreground-secondary">
            {t("readOnlyHint")}
          </p>
          {isTaskRunning && (
            <p className="text-caption text-primary mt-0.5">
              {t("runningHint")}
            </p>
          )}
        </div>

        {isTaskRunning && onCancelTask && (
          <button
            type="button"
            disabled={cancelling}
            onClick={onCancelTask}
            className="
              shrink-0 rounded-xl border border-error/40 bg-error/10
              px-4 py-2.5 text-btn text-error
              transition hover:bg-error/20 hover:cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {cancelling ? t("cancelling") : t("cancelTask")}
          </button>
        )}
      </div>
    </div>
  );
}
