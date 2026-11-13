"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef, Dispatch, SetStateAction, useSyncExternalStore } from "react";
import {
  Message,
  Attachment,
  StreamEvent,
  AgentStep,
  GeneratedFile,
  ConversationKind,
} from "../types/chat";
import { useLocale } from "next-intl";
import { useConnection } from "../components/auth/ConnectionContext";
import { apiFetch } from "../lib/api";
import { AccessInfoModalStatus } from "../components/modals/accessInfo";
import { cacheGeneratedFileIds } from "../lib/FileCache";
import {
  abortChatStream,
  endChatStream,
  clearLastStreamSnapshot,
  getLastStreamSnapshot,
  getStreamMessages,
  isChatStreaming,
  notifyTaskRunning,
  startChatStream,
  subscribeChatStreams,
  updateChatStreamMessages,
} from "./chatStreamStore";

const optimisticMessagesByChatId = new Map<string, Message[]>();
const CONNECT_TIMEOUT_MS = 30_000;

function getOptimisticMessages(chatId?: string) {
  if (!chatId) return [];

  return optimisticMessagesByChatId.get(chatId) ?? [];
}

function setOptimisticMessages(chatId: string, messages: Message[]) {
  optimisticMessagesByChatId.set(chatId, messages);
}

function clearOptimisticMessages(chatId?: string) {
  if (!chatId) return;

  optimisticMessagesByChatId.delete(chatId);
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

const CONNECT_TIMEOUT_REASON = "connect-timeout";

function isConnectTimeoutError(err: unknown): boolean {
  if (!isAbortError(err)) return false;
  const reason =
    err instanceof DOMException
      ? err.message
      : err instanceof Error
        ? err.message
        : "";
  return reason === CONNECT_TIMEOUT_REASON || reason.includes("connect-timeout");
}

function parseApiError(err: unknown): {
  code?: string;
  message: string;
  detail?: AccessInfoModalStatus;
} {
  if (!(err instanceof Error)) {
    return { message: "Unknown error" };
  }

  if (isConnectTimeoutError(err)) {
    return {
      code: "NETWORK_ERROR",
      message: "Connection timed out. Check your network and try again.",
    };
  }

  try {
    const data = JSON.parse(err.message) as {
      code?: string;
      message?: string;
      detail?: AccessInfoModalStatus;
    };
    return {
      code: data.code,
      message: data.message ?? err.message,
      detail: data.detail,
    };
  } catch {
    return { code: "NETWORK_ERROR", message: err.message };
  }
}

function generatedFileToAttachment(file: GeneratedFile): Attachment {
  return {
    fileId: file.id,
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.sizeBytes,
    generated: true,
  };
}

function normalizeAttachment(attachment: Attachment & { sizeBytes?: number }) {
  const rawSize = attachment.sizeBytes ?? attachment.size;
  const size = typeof rawSize === "number"
    ? rawSize
    : Number.parseFloat(String(rawSize)) * (String(rawSize).includes("MB") ? 1024 * 1024 : 1);

  return { ...attachment, size: Number.isFinite(size) ? size : 0 };
}

function normalizeMessage(message: Message & {
  generatedFiles?: GeneratedFile[];
  generatedImages?: GeneratedFile[];
  generated_files?: GeneratedFile[];
  generated_images?: GeneratedFile[];
}): Message {
  const generatedFiles =
    message.generatedFiles ??
    message.generatedImages ??
    message.generated_files ??
    message.generated_images ??
    [];
  return {
    ...message,
    attachments: [
      ...(message.attachments ?? []).map((att) => {
        const normalized = normalizeAttachment(att);
        const isGenerated = Boolean(
          att.generated ??
            (att as { is_generated?: boolean }).is_generated ??
            (att as { source?: string }).source === "generated",
        );
        return isGenerated ? { ...normalized, generated: true } : normalized;
      }),
      ...generatedFiles.map(generatedFileToAttachment),
    ],
  };
}

export function useChat(setModalState: Dispatch<SetStateAction<AccessInfoModalStatus | null>>, chatId?: string, kind: ConversationKind = "chat") {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (chatId) {
      const live = getStreamMessages(chatId);
      if (live) return live;
    }
    return getOptimisticMessages(chatId);
  });
  const [loading, setLoading] = useState(() => {
    if (!chatId) return false;
    return !isChatStreaming(chatId);
  });
  const [error, setError] = useState<string | null>(null);
  const previousChatIdRef = useRef<string | undefined>(chatId);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [shouldMessagesLoad, setShouldMessagesLoad] = useState(false);

  const locale = useLocale();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { state } = useConnection();

  const sending = useSyncExternalStore(
    subscribeChatStreams,
    () => isChatStreaming(chatId),
    () => false,
  );

  useEffect(() => {
    if (!chatId) return;

    return subscribeChatStreams(() => {
      const live = getStreamMessages(chatId);
      if (live) {
        setMessages(live);
        setLoading(false);
        return;
      }

      const snapshot = getLastStreamSnapshot(chatId);
      if (snapshot) {
        setMessages(snapshot);
        setLoading(false);
        clearLastStreamSnapshot(chatId);
      }
    });
  }, [chatId]);

  useLayoutEffect(() => {
    const previousChatId = previousChatIdRef.current;
    if (previousChatId === chatId) return;

    previousChatIdRef.current = chatId;
    setError(null);

    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const live = getStreamMessages(chatId);
    if (live) {
      setMessages(live);
      setLoading(false);
      return;
    }

    const optimistic = getOptimisticMessages(chatId);
    setMessages(optimistic);
    setLoading(optimistic.length === 0);
  }, [chatId]);

  useEffect(() => {
    let cancelled = false;

    if (state !== "ready") {
      return;
    }

    async function loadMessages() {
      if (!chatId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      if (isChatStreaming(chatId)) {
        const live = getStreamMessages(chatId);
        if (live) setMessages(live);
        setLoading(false);
        return;
      }

      const snapshot = getLastStreamSnapshot(chatId);
      if (snapshot) {
        setMessages(snapshot);
        setLoading(false);
        clearLastStreamSnapshot(chatId);
      }

      setLoading(!snapshot);
      setError(null);

      try {
        const objectsSegment = kind === "task" ? "tasks" : "chats";
        const res = await apiFetch(
          `/api/conversations/${objectsSegment}/${chatId}/objects`,
          {
            credentials: "include",
          },
        );

        if (!res.ok) throw new Error(`Backend вернул ${res.status}`);
        const data: Message[] = (await res.json()).map(normalizeMessage);

        if (!cancelled) {
          if (isChatStreaming(chatId)) {
            const live = getStreamMessages(chatId);
            if (live) setMessages(live);
            setLoading(false);
            return;
          }

          if (data.length > 0) {
            clearOptimisticMessages(chatId);
            // Не затираем более «живой» snapshot стрима устаревшим pending с API
            const hasPendingOnly =
              data.some(
                (m) => m.role === "assistant" && m.status === "pending",
              ) &&
              snapshot &&
              snapshot.some(
                (m) =>
                  m.role === "assistant" &&
                  m.status !== "pending" &&
                  m.status !== "approval_required",
              );
            if (!hasPendingOnly) {
              setMessages(data);
            }
          } else if (!snapshot) {
            setMessages(getOptimisticMessages(chatId));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load messages",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
        if (shouldMessagesLoad) setShouldMessagesLoad(false);
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [chatId, kind, state, shouldMessagesLoad]);

  async function streamAI(
    url: string,
    body: Record<string, unknown>,
    onEvent: (event: StreamEvent) => void,
    signal: AbortSignal,
  ) {
    const fetchController = new AbortController();
    let connectTimedOut = false;

    const onParentAbort = () => {
      fetchController.abort(signal.reason);
    };
    if (signal.aborted) {
      onParentAbort();
    } else {
      signal.addEventListener("abort", onParentAbort);
    }

    const connectTimer = setTimeout(() => {
      connectTimedOut = true;
      fetchController.abort(
        new DOMException(CONNECT_TIMEOUT_REASON, "AbortError"),
      );
    }, CONNECT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: fetchController.signal,
      });
      clearTimeout(connectTimer);
    } catch (err) {
      clearTimeout(connectTimer);
      signal.removeEventListener("abort", onParentAbort);

      if (connectTimedOut || isConnectTimeoutError(err)) {
        throw new Error(
          JSON.stringify({
            code: "NETWORK_ERROR",
            message: "Connection timed out. Check your network and try again.",
          }),
        );
      }
      if (isAbortError(err)) throw err;
      throw new Error(
        JSON.stringify({
          code: "NETWORK_ERROR",
          message:
            err instanceof Error ? err.message : "Failed to reach the server",
        }),
      );
    }

    try {
      if (!response.ok || !response.body) {
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          payload = {
            code: "HTTP_ERROR",
            message: `Request failed with status ${response.status}`,
            status: response.status,
          };
        }
        throw new Error(
          typeof payload === "string" ? payload : JSON.stringify(payload),
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) {
              continue;
            }

            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") {
              continue;
            }

            const event: StreamEvent = JSON.parse(data);
            onEvent(event);
          }
        }
      } catch (err) {
        if (isAbortError(err)) throw err;
        throw new Error(
          JSON.stringify({
            code: "STREAM_ERROR",
            message:
              err instanceof Error
                ? err.message
                : "Connection lost while streaming",
          }),
        );
      } finally {
        reader.releaseLock();
      }
    } finally {
      signal.removeEventListener("abort", onParentAbort);
    }
  }

  async function cacheGeneratedFiles(files: GeneratedFile[]) {
    await cacheGeneratedFileIds(files);
  }

  function handleStreamEvent(
    event: StreamEvent,
    updateMessage: (updater: (message: Message) => Message) => void,
  ) {
    switch (event.type) {
      case "step_start": {
        const newStep: AgentStep = {
          id: event.id,
          kind: event.kind,
          label: event.label,
          status: event.status,
          toolName: event.toolName,
          approvalDetails: event.approvalDetails,
          toolDetails: event.toolDetails,
          failedGeneration: event.failedGeneration,
        };

        updateMessage((message) => ({
          ...message,
          streamingReasoning:
            event.kind === "reasoning"
              ? undefined
              : message.streamingReasoning,
          steps: [
            ...(message.steps ?? []),
            event.kind === "reasoning" && !event.label
              ? { ...newStep, label: message.streamingReasoning ?? "" }
              : newStep,
          ],
        }));
        break;
      }

      case "step_update":
        updateMessage((message) => ({
          ...message,
          steps: (message.steps ?? []).map((step) =>
            step.id === event.id
              ? {
                  ...step,
                  status: event.status,
                  approvalDetails: event.approvalDetails,
                  toolDetails: event.toolDetails,
                  failedGeneration: event.failedGeneration,
                }
              : step,
          ),
        }));
        break;

      case "text_delta":
        updateMessage((message) => ({
          ...message,
          streamingReasoning: (message.streamingReasoning ?? "") + event.delta,
        }));
        break;

      case "done":
        updateMessage((message) => ({
          ...message,
          status: event.status,
          text: event.content,
          streamingReasoning: undefined,
          steps: event.steps ?? message.steps,
          processingSeconds:
            (message.processingSeconds ?? 0) +
            event.processingSeconds,
          attachments: [
            ...(message.attachments ?? []),
            ...(event.generatedFiles ?? []).map(generatedFileToAttachment),
          ],
        }));
        void cacheGeneratedFiles(
          event.generatedFiles ?? [],
        );
        break;

      case "error":
        updateMessage((message) => ({
          ...message,
          status: "error",
          text: event.message,
          streamingReasoning: undefined,
        }));
        break;
    }
  }

  const sendMessage = useCallback(
    async (
      prompt: string,
      attachments: Attachment[] = [],
      fileIds: string[] = [],
      newChatId?: string,
    ) => {
      const targetChatId = newChatId ?? chatId;
      if (!targetChatId) return;

      if (isChatStreaming(targetChatId)) return;

      const userAbort = new AbortController();

      const optimisticUserMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        status: "completed",
        text: prompt,
        attachments: attachments,
        createdAt: new Date().toISOString(),
        applyToolUse: applyToolUse,
      };

      const optimisticAgentMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        status: "pending",
        text: "",
        createdAt: new Date().toISOString(),
        applyToolUse: applyToolUse,
      };

      const baseMessages =
        targetChatId === chatId
          ? messagesRef.current
          : (getStreamMessages(targetChatId) ??
            getOptimisticMessages(targetChatId));

      const nextMessages = [
        ...baseMessages,
        optimisticUserMsg,
        optimisticAgentMessage,
      ];

      setOptimisticMessages(targetChatId, nextMessages);
      startChatStream(targetChatId, nextMessages, userAbort);
      notifyTaskRunning(targetChatId, true);

      if (targetChatId === chatId || !chatId) {
        setMessages(nextMessages);
        setLoading(false);
        setError(null);
      }

      const updateLastAssistantMessage = (
        updater: (message: Message) => Message,
      ) => {
        updateChatStreamMessages(targetChatId, (prev) => {
          const index = prev.findLastIndex((m) => m.role === "assistant");
          if (index === -1) return prev;
          return prev.map((message, i) =>
            i === index ? updater(message) : message,
          );
        });
      };

      let receivedStreamEvent = false;
      let handoffToBackendTask = false;

      try {
        try {
          await streamAI(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/ai/zeyrix/stream`,
            {
              chatId: targetChatId,
              fileIds,
              userPrompt: prompt,
              locale: locale,
              timezone: timezone,
            },
            (event) => {
              receivedStreamEvent = true;
              handleStreamEvent(event, updateLastAssistantMessage);
            },
            userAbort.signal,
          );
        } catch (error) {
          if (isAbortError(error) && userAbort.signal.aborted) {
            updateChatStreamMessages(targetChatId, (prev) =>
              prev.map((message, index) => {
                if (
                  index === prev.findLastIndex((m) => m.role === "assistant")
                ) {
                  return { ...message, status: "cancelled" };
                }
                return message;
              }),
            );
            return;
          }

          const apiError = parseApiError(error);

          if (apiError.code === "INVITE_REQUIRED") {
            setModalState(apiError.detail ?? null);
          }

          if (
            receivedStreamEvent ||
            apiError.code === "STREAM_ERROR"
          ) {
            handoffToBackendTask = true;
            return;
          }

          updateChatStreamMessages(targetChatId, (prev) => {
            const next = [...prev];
            const lastAgentIndex = next.findLastIndex(
              (message) => message.role === "assistant",
            );
            if (lastAgentIndex !== -1) {
              next.splice(lastAgentIndex, 1);
            }

            const lastUserIndex = next.findLastIndex(
              (message) => message.role === "user",
            );
            if (lastUserIndex !== -1) {
              next[lastUserIndex] = {
                ...next[lastUserIndex],
                status: "error",
                notSent: true,
                retrySendMessage: retrySendMessage,
              };
            }

            return next;
          });
        }
      } finally {
        const finalMessages = getStreamMessages(targetChatId);
        if (finalMessages) {
          setOptimisticMessages(targetChatId, finalMessages);
          if (previousChatIdRef.current === targetChatId) {
            setMessages(finalMessages);
          }
        }
        endChatStream(targetChatId);

        if (handoffToBackendTask) {
          // Переподписка на ту же task через новый API
          notifyTaskRunning(targetChatId, true);
          void import("../lib/chatTaskStream").then(({ subscribeToChatTask }) =>
            subscribeToChatTask(targetChatId, "chat", {
              onEnded: (id) => notifyTaskRunning(id, false),
            }),
          );
        } else {
          notifyTaskRunning(targetChatId, false);
        }
      }
    },
    [chatId, locale, timezone, setModalState],
  );

  async function retrySendMessage(id: string, prompt: string, attachments: Attachment[], deleteFromLocal: boolean = true) {
    if (deleteFromLocal) {
      setMessages((prev) =>
        prev.filter((message) => message.id !== id)
      );
    }

    const fileIds = attachments.map((attachment) => attachment.fileId)

    try {
      await sendMessage(prompt, attachments, fileIds)
    } catch(error) {

    }
  }

  const applyToolUse = useCallback(
    async (requestId: string, action: "confirm" | "reject") => {
      const targetChatId = previousChatIdRef.current;
      if (!targetChatId || isChatStreaming(targetChatId)) return;

      setError(null);

      const userAbort = new AbortController();
      const base = messagesRef.current;

      const withPending = (() => {
        const index = base.findLastIndex(
          (message) =>
            message.role === "assistant" &&
            (message.status === "approval_required" ||
              message.status === "pending"),
        );
        if (index === -1) return base;
        return base.map((message, i) =>
          i === index ? { ...message, status: "pending" as const } : message,
        );
      })();

      startChatStream(targetChatId, withPending, userAbort);
      notifyTaskRunning(targetChatId, true);
      setMessages(withPending);

      const updateApproveRequiredMessage = (
        updater: (message: Message) => Message,
      ) => {
        updateChatStreamMessages(targetChatId, (prev) => {
          const index = prev.findLastIndex(
            (message) =>
              message.role === "assistant" &&
              (message.status === "approval_required" ||
                message.status === "pending"),
          );
          if (index === -1) return prev;
          return prev.map((message, i) =>
            i === index ? updater(message) : message,
          );
        });
      };

      try {
        await streamAI(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/ai/apply_tool`,
          {
            requestId: requestId,
            action: action,
            locale: locale,
            timezone: timezone,
          },
          (event) => handleStreamEvent(event, updateApproveRequiredMessage),
          userAbort.signal,
        );
      } catch (err) {
        if (isAbortError(err) && userAbort.signal.aborted) {
          updateChatStreamMessages(targetChatId, (prev) =>
            prev.map((message, index) => {
              if (index === prev.findLastIndex((m) => m.role === "assistant")) {
                return { ...message, status: "cancelled" };
              }
              return message;
            }),
          );
          return;
        }

        const apiError = parseApiError(err);

        if (apiError.code === "INVITE_REQUIRED") {
          setModalState(apiError.detail ?? null);
        }

        const fallbackText =
          apiError.code === "NETWORK_ERROR" || apiError.code === "STREAM_ERROR"
            ? apiError.message
            : apiError.message ||
              `Failed to handle the request.\nTry again in a moment.\nIf this problem will repeat, please, inform us.`;

        updateChatStreamMessages(targetChatId, (prev) => {
          const index = prev.findLastIndex(
            (message) => message.role === "assistant",
          );
          if (index === -1) return prev;

          return prev.map((message, i) =>
            i === index
              ? {
                  ...message,
                  status: "error",
                  text: fallbackText,
                }
              : message,
          );
        });

        setError(fallbackText);
      } finally {
        const finalMessages = getStreamMessages(targetChatId);
        if (finalMessages) {
          setOptimisticMessages(targetChatId, finalMessages);
          if (previousChatIdRef.current === targetChatId) {
            setMessages(finalMessages);
          }
        }
        endChatStream(targetChatId);
        notifyTaskRunning(targetChatId, false);
      }
    },
    [locale, timezone, setModalState],
  );

  const stopGeneration = useCallback(() => {
    if (!chatId) return;
    void import("../lib/chatTaskStream").then(({ cancelChatTask }) =>
      cancelChatTask(chatId, kind),
    );
  }, [chatId, kind]);

  return { messages, loading, error, sending, sendMessage, applyToolUse, retrySendMessage, stopGeneration, setShouldMessagesLoad };
}
