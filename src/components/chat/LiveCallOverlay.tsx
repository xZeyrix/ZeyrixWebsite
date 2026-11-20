"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { useLiveCall } from "@/src/hooks/useLiveCall";
import WaveformIcon from "@/src/icons/waveform.svg";
import MicroIcon from "@/src/icons/microphone.svg";
import CloseIcon from "@/src/icons/close.svg";
import PhoneIcon from "@/src/icons/phone.svg";

type LiveCallOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Existing chat only — required for WS query param chatId */
  chatId?: string;
};

export function LiveCallOverlay({
  open,
  onClose,
  chatId,
}: LiveCallOverlayProps) {
  const t = useTranslations("liveCall");
  const { status, error, turns, muted, setMuted, start, stop } = useLiveCall({
    chatId,
  });
  const listRef = useRef<HTMLDivElement>(null);

  // Stop only when overlay fully closes — never auto-start
  useEffect(() => {
    if (open) return;
    stop();
  }, [open, stop]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns]);

  const inCall = status === "connecting" || status === "live";
  const canStart = Boolean(chatId) && !inCall;

  const statusLabel =
    status === "idle"
      ? t("ready")
      : status === "connecting"
        ? t("connecting")
        : status === "live"
          ? t("live")
          : status === "error"
            ? t("error")
            : t("ended");

  function handleClose() {
    stop();
    onClose();
  }

  function handleCallToggle() {
    if (inCall) {
      stop();
      return;
    }
    if (canStart) void start();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-100 flex items-end sm:items-center justify-center px-0 sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Close backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="
              relative w-full sm:max-w-md
              rounded-t-3xl sm:rounded-3xl
              border border-border bg-surface/95 shadow-2xl shadow-black/40
              overflow-hidden flex flex-col
              max-h-[min(92dvh,680px)]
              backdrop-blur-xl
            "
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-2xl bg-primary/12 border border-primary/20 flex items-center justify-center shrink-0">
                  <WaveformIcon className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-body font-medium text-foreground truncate">
                    {t("title")}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        size-1.5 rounded-full shrink-0
                        ${status === "live" ? "bg-primary animate-pulse" : ""}
                        ${status === "connecting" ? "bg-warning animate-pulse" : ""}
                        ${status === "idle" ? "bg-foreground-muted" : ""}
                        ${status === "error" ? "bg-error" : ""}
                        ${status === "ended" ? "bg-foreground-muted" : ""}
                      `}
                    />
                    <p className="text-caption text-foreground-muted">
                      {statusLabel}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-elevated hover:cursor-pointer transition-colors"
                aria-label={t("close")}
              >
                <CloseIcon className="size-4 text-foreground-muted" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 pt-6 pb-4 flex flex-col items-center gap-5 min-h-0 flex-1">
              {/* Avatar / pulse ring */}
              <div className="relative size-28 shrink-0 flex items-center justify-center">
                {status === "live" && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                    <span className="absolute inset-2 rounded-full border border-primary/25" />
                  </>
                )}
                <div
                  className={`
                    relative size-24 rounded-full flex items-center justify-center
                    border transition-colors duration-300
                    ${status === "live" ? "bg-primary/15 border-primary/30" : "bg-elevated border-border"}
                  `}
                >
                  <WaveformIcon
                    className={`size-10 transition-colors ${
                      status === "live"
                        ? "text-primary"
                        : "text-foreground-muted"
                    }`}
                  />
                </div>
              </div>

              <p className="text-body-sm text-foreground-muted text-center max-w-[16rem]">
                {!chatId
                  ? t("needChat")
                  : status === "idle"
                    ? t("tapToCall")
                    : status === "live"
                      ? muted
                        ? t("mutedHint")
                        : t("listening")
                      : status === "connecting"
                        ? t("connecting")
                        : status === "ended"
                          ? t("endedHint")
                          : error
                            ? error
                            : t("error")}
              </p>

              {/* Transcript history */}
              <div
                ref={listRef}
                className="w-full flex-1 min-h-28 max-h-52 overflow-y-auto space-y-2 pr-0.5"
              >
                <AnimatePresence initial={false}>
                  {turns.map((turn) => (
                    <motion.div
                      key={turn.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className={`
                        rounded-2xl px-3.5 py-2.5
                        ${
                          turn.role === "user"
                            ? "bg-elevated border border-border/60"
                            : "bg-primary/10 border border-primary/15"
                        }
                      `}
                    >
                      <p
                        className={`text-caption mb-1 ${
                          turn.role === "user"
                            ? "text-foreground-muted"
                            : "text-primary"
                        }`}
                      >
                        {turn.role === "user" ? t("you") : t("agent")}
                      </p>
                      <p
                        className={`text-body-sm whitespace-pre-wrap leading-relaxed ${
                          turn.role === "user"
                            ? "text-foreground-secondary"
                            : "text-foreground"
                        }`}
                      >
                        {turn.text}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {error && status === "error" && (
                  <p className="text-center text-body-sm text-error px-2">
                    {error}
                  </p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="px-5 pb-6 pt-2 flex items-center justify-center gap-5 shrink-0 border-t border-border/60 bg-background/40">
              {/* Mute — only meaningful while in call */}
              <button
                type="button"
                disabled={!inCall || status === "connecting"}
                onClick={() => setMuted(!muted)}
                aria-pressed={muted}
                aria-label={muted ? t("unmute") : t("mute")}
                className={`
                  size-12 rounded-full flex items-center justify-center
                  border transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${
                    muted
                      ? "bg-error/15 border-error/40 text-error"
                      : "bg-elevated border-border text-foreground-secondary hover:bg-border/80"
                  }
                  ${inCall && status === "live" ? "hover:cursor-pointer" : ""}
                `}
              >
                <span className="relative">
                  <MicroIcon className="size-5" />
                  {muted && (
                    <span className="absolute left-1/2 top-1/2 h-0.5 w-6 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-error" />
                  )}
                </span>
              </button>

              {/* Main call / hang up */}
              <button
                type="button"
                disabled={!inCall && !canStart}
                onClick={handleCallToggle}
                aria-label={inCall ? t("hangUp") : t("call")}
                className={`
                  size-16 rounded-full flex items-center justify-center
                  transition-all duration-200 shadow-lg
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:cursor-pointer
                  ${
                    inCall
                      ? "bg-error hover:bg-error/90 text-foreground shadow-error/30"
                      : "bg-primary hover:bg-primary-hover text-primary-surface shadow-primary/25"
                  }
                `}
              >
                <PhoneIcon
                  className={`size-7 ${inCall ? "rotate-135" : ""} transition-transform duration-300`}
                />
              </button>

              {/* Spacer mirror for visual balance */}
              <div className="size-12" aria-hidden />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
