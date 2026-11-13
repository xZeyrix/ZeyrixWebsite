"use client";

import { useEffect, useRef } from "react";
import type { Message } from "../types/chat";
import { isChatStreaming } from "./chatStreamStore";
import { subscribeToChatTask } from "../lib/chatTaskStream";

const POLL_MS = 10_000;

/**
 * Poll subscribe_to_task only for the currently open scheduled task.
 * - Immediate attempt on open
 * - Then every 10s while tab is visible
 * - Skips if stream already active
 * - Skips if an execution/message already exists with createdAt >= nextRunAt
 * - Never stacks concurrent subscribe calls
 */
export function useOpenTaskPoll({
  taskId,
  nextRunAt,
  isTaskRunning,
  messages,
  enabled,
  onStreamEnded,
}: {
  taskId?: string;
  nextRunAt?: string | null;
  isTaskRunning?: boolean;
  messages: Message[];
  enabled: boolean;
  onStreamEnded?: () => void;
}) {
  const inFlightRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const nextRunAtRef = useRef(nextRunAt);
  nextRunAtRef.current = nextRunAt;
  const onStreamEndedRef = useRef(onStreamEnded);
  onStreamEndedRef.current = onStreamEnded;

  useEffect(() => {
    if (!enabled || !taskId || !nextRunAt) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const hasExecutionForRun = () => {
      const runAt = nextRunAtRef.current;
      if (!runAt) return false;
      const runAtMs = new Date(runAt).getTime();
      if (Number.isNaN(runAtMs)) return false;
      return messagesRef.current.some((m) => {
        const created = new Date(m.createdAt).getTime();
        if (Number.isNaN(created)) return false;
        return created >= runAtMs;
      });
    };

    const shouldAttempt = () => {
      if (cancelled) return false;
      if (document.visibilityState !== "visible") return false;
      if (isChatStreaming(taskId)) return false;
      if (inFlightRef.current) return false;
      const runAt = nextRunAtRef.current;
      if (!runAt) return false;
      const runAtMs = new Date(runAt).getTime();
      if (Number.isNaN(runAtMs) || runAtMs > Date.now()) return false;
      if (hasExecutionForRun()) return false;
      return true;
    };

    const attempt = async () => {
      if (!shouldAttempt()) return;

      inFlightRef.current = true;
      try {
        const result = await subscribeToChatTask(taskId, "task", {
          onEnded: (_id, streamResult) => {
            if (streamResult === "connected") {
              onStreamEndedRef.current?.();
            }
          },
        });
        void result;
      } finally {
        inFlightRef.current = false;
      }
    };

    // Immediate on open
    void attempt();

    intervalId = setInterval(() => {
      void attempt();
    }, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void attempt();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // Re-run only when the open task identity / schedule changes — not on every messages tick
  // intentionally NOT depending on isTaskRunning/messages — those change during
  // subscribe and would restart the interval into a request storm
  }, [enabled, taskId, nextRunAt]);
}
