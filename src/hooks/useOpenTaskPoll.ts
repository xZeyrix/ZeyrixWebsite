"use client";

import { useEffect, useRef } from "react";
import type { Message } from "../types/chat";
import { isChatStreaming } from "./chatStreamStore";
import { subscribeToChatTask } from "../lib/chatTaskStream";

const POLL_MS = 10_000;

function hasExecutionForRun(
  messages: Message[],
  nextRunAt: string | null | undefined,
): boolean {
  if (!nextRunAt) return false;
  const runAtMs = new Date(nextRunAt).getTime();
  if (Number.isNaN(runAtMs)) return false;
  return messages.some((m) => {
    const created = new Date(m.createdAt).getTime();
    if (Number.isNaN(created)) return false;
    return created >= runAtMs;
  });
}

/**
 * Poll subscribe_to_task only for the currently open scheduled task.
 *
 * Critical timing rules:
 * - Do NOT attempt until messages for this task have finished loading
 *   (otherwise empty messages look like "no execution yet" → false subscribe)
 * - Immediate attempt once messages are ready, then every 10s
 * - Abort in-flight subscribe when switching tasks / unmounting
 * - Skip if an execution already exists with createdAt >= nextRunAt
 */
export function useOpenTaskPoll({
  taskId,
  nextRunAt,
  messages,
  messagesReady,
  enabled,
  onStreamEnded,
}: {
  taskId?: string;
  nextRunAt?: string | null;
  messages: Message[];
  /** true when initial objects fetch for this task has finished */
  messagesReady: boolean;
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
  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !taskId || !nextRunAt) return;
    // Wait until executions/messages are loaded — avoids racing an empty list
    if (!messagesReady) return;

    // Already have a result for this scheduled run — never subscribe
    if (hasExecutionForRun(messagesRef.current, nextRunAt)) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const shouldAttempt = () => {
      if (cancelled) return false;
      if (document.visibilityState !== "visible") return false;
      if (isChatStreaming(taskId)) return false;
      if (inFlightRef.current) return false;
      const runAt = nextRunAtRef.current;
      if (!runAt) return false;
      const runAtMs = new Date(runAt).getTime();
      if (Number.isNaN(runAtMs) || runAtMs > Date.now()) return false;
      if (hasExecutionForRun(messagesRef.current, runAt)) return false;
      return true;
    };

    const attempt = async () => {
      if (!shouldAttempt()) return;

      inFlightRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await subscribeToChatTask(taskId, "task", {
          signal: controller.signal,
          nextRunAt: nextRunAtRef.current,
          onEnded: (id, streamResult) => {
            // Ignore callbacks from a task we already navigated away from
            if (taskIdRef.current !== id) return;
            if (streamResult === "connected") {
              onStreamEndedRef.current?.();
            }
          },
        });
        void result;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        inFlightRef.current = false;
      }
    };

    // Messages just became ready for this task → one immediate check
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
      // Abort in-flight subscribe so switching tasks cannot:
      // 1) keep hitting the API
      // 2) fire onEnded → refreshTasks → extra GET /conversations/
      abortRef.current?.abort();
      abortRef.current = null;
      inFlightRef.current = false;
    };
  }, [enabled, taskId, nextRunAt, messagesReady]);
}
