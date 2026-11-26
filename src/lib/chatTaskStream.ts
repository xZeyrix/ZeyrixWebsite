import {
  AgentStep,
  ConversationKind,
  GeneratedFile,
  Message,
  StreamEvent,
} from "../types/chat";
import { apiFetch, apiUrl } from "./api";
import { cacheGeneratedFileIds } from "./FileCache";
import {
  abortChatStream,
  endChatStream,
  getStreamMessages,
  isChatStreaming,
  notifyTaskRunning,
  setLastStreamSnapshot,
  startChatStream,
  updateChatStreamMessages,
} from "../hooks/chatStreamStore";

const CONNECT_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_REASON = "connect-timeout";

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

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

function generatedFileToAttachment(file: GeneratedFile) {
  return {
    fileId: file.id,
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.sizeBytes,
    generated: true,
  };
}

async function cacheGeneratedFiles(files: GeneratedFile[]) {
  await cacheGeneratedFileIds(files);
}

export function applyStreamEvent(
  event: StreamEvent,
  updateMessage: (updater: (message: Message) => Message) => void,
) {
  switch (event.type) {
    case "step_start": {
      const incoming: AgentStep = {
        id: event.id,
        kind: event.kind,
        label: event.label,
        status: event.status,
        toolName: event.toolName,
        approvalDetails: event.approvalDetails,
        toolDetails: event.toolDetails,
        failedGeneration: event.failedGeneration,
      };

      updateMessage((message) => {
        const steps = message.steps ?? [];
        const label =
          event.kind === "reasoning" && !event.label
            ? (message.streamingReasoning ?? incoming.label)
            : incoming.label;
        const newStep = { ...incoming, label };
        const existingIdx = steps.findIndex((s) => s.id === event.id);
        const nextSteps =
          existingIdx >= 0
            ? steps.map((s, i) =>
                i === existingIdx ? { ...s, ...newStep } : s,
              )
            : [...steps, newStep];

        return {
          ...message,
          streamingReasoning:
            event.kind === "reasoning" ? undefined : message.streamingReasoning,
          steps: nextSteps,
        };
      });
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

    case "done": {
      const files = event.generatedFiles ?? [];
      updateMessage((message) => ({
        ...message,
        status: event.status,
        text: event.content,
        streamingReasoning: undefined,
        // done всегда несёт полный список шагов после переподписки
        steps: event.steps ?? message.steps ?? [],
        processingSeconds:
          (message.processingSeconds ?? 0) + event.processingSeconds,
        attachments: mergeAttachments(
          message.attachments,
          files.map(generatedFileToAttachment),
        ),
      }));
      void cacheGeneratedFiles(files);
      break;
    }

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

export async function streamAI(
  url: string,
  body: Record<string, unknown> | undefined,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
  /** Fired once the HTTP stream is open (before any SSE events). */
  onOpen?: () => void,
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
      body: body ? JSON.stringify(body) : undefined,
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

    onOpen?.();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;

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

function normalizeMessage(
  message: Message & {
    generatedFiles?: GeneratedFile[];
    generatedImages?: GeneratedFile[];
    generated_files?: GeneratedFile[];
    generated_images?: GeneratedFile[];
    steps?: Message["steps"];
  },
): Message {
  const generatedFiles =
    message.generatedFiles ??
    message.generatedImages ??
    message.generated_files ??
    message.generated_images ??
    [];

  const rawAttachments = message.attachments ?? [];

  return {
    ...message,
    steps: message.steps ?? [],
    attachments: [
      ...rawAttachments.map((attachment) => {
        const rawSize =
          (attachment as { sizeBytes?: number; size_bytes?: number })
            .sizeBytes ??
          (attachment as { size_bytes?: number }).size_bytes ??
          attachment.size;
        const size =
          typeof rawSize === "number"
            ? rawSize
            : Number.parseFloat(String(rawSize)) *
              (String(rawSize).includes("MB") ? 1024 * 1024 : 1);
        const fileId =
          attachment.fileId ??
          (attachment as { file_id?: string }).file_id ??
          (attachment as { id?: string }).id ??
          crypto.randomUUID();
        const isGenerated = Boolean(
          attachment.generated ??
            (attachment as { is_generated?: boolean }).is_generated ??
            (attachment as { source?: string }).source === "generated",
        );
        return {
          fileId,
          filename:
            attachment.filename ??
            (attachment as { name?: string }).name ??
            "file",
          mimeType:
            attachment.mimeType ??
            (attachment as { mime_type?: string }).mime_type ??
            "application/octet-stream",
          size: Number.isFinite(size) ? size : 0,
          generated: isGenerated,
        };
      }),
      ...generatedFiles.map((file) =>
        generatedFileToAttachment({
          ...file,
          id: file.id,
          mimeType:
            file.mimeType ??
            (file as { mime_type?: string }).mime_type ??
            "application/octet-stream",
          filename:
            file.filename ?? (file as { name?: string }).name ?? "file",
          sizeBytes:
            file.sizeBytes ??
            (file as { size_bytes?: number }).size_bytes ??
            0,
          type: file.type ?? "document",
        }),
      ),
    ],
    applyToolUse: message.applyToolUse ?? (async () => {}),
  };
}

function mergeAttachments(
  a?: Message["attachments"],
  b?: Message["attachments"],
): Message["attachments"] {
  if (!a?.length && !b?.length) return undefined;
  const map = new Map<string, NonNullable<Message["attachments"]>[number]>();
  for (const att of [...(a ?? []), ...(b ?? [])]) {
    map.set(att.fileId, att);
  }
  return Array.from(map.values());
}

/** Prevent parallel subscribe storms for the same conversation */
const subscribeInFlight = new Set<string>();

export type SubscribeResult =
  | "already_streaming"
  | "connected"
  | "no_task"
  | "error"
  | "aborted"
  | "already_executed";

export type SubscribeToChatTaskOptions = {
  onEnded?: (conversationId: string, result: SubscribeResult) => void;
  /** External abort (e.g. user switched tasks) */
  signal?: AbortSignal;
  /** If set, skip streaming when objects already contain an execution at/after this time */
  nextRunAt?: string | null;
  /**
   * Conversation is known to have isTaskRunning on the server.
   * Subscribe even if the last object is still `approval_required` (user already
   * confirmed; objects API may lag until stream events update steps).
   */
  forceRunning?: boolean;
};

function objectsPath(kind: ConversationKind, conversationId: string) {
  const segment = kind === "task" ? "tasks" : "chats";
  return `/api/conversations/${segment}/${conversationId}/objects`;
}

function isNoActiveTaskError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  let msg = err.message;
  try {
    const parsed = JSON.parse(err.message) as {
      message?: string;
      detail?: string;
      user_detail?: string;
      code?: string;
    };
    msg = [parsed.message, parsed.detail, parsed.user_detail, parsed.code]
      .filter(Boolean)
      .join(" ");
  } catch {
    // plain text
  }
  const lower = msg.toLowerCase();
  return (
    lower.includes("no task") ||
    lower.includes("don't have an active task") ||
    lower.includes("do not have an active task") ||
    lower.includes("no longer available") ||
    lower.includes("invalid conversation reference") ||
    lower.includes("not available")
  );
}

export async function subscribeToChatTask(
  conversationId: string,
  kind: ConversationKind = "chat",
  options: SubscribeToChatTaskOptions = {},
): Promise<SubscribeResult> {
  if (isChatStreaming(conversationId)) return "already_streaming";

  const controller = new AbortController();
  const onExternalAbort = () => {
    controller.abort(options.signal?.reason);
  };
  if (options.signal) {
    if (options.signal.aborted) {
      return "aborted";
    }
    options.signal.addEventListener("abort", onExternalAbort);
  }

  if (subscribeInFlight.has(conversationId)) {
    options.signal?.removeEventListener("abort", onExternalAbort);
    return "already_streaming";
  }
  subscribeInFlight.add(conversationId);

  let initialMessages: Message[] = [];
  try {
    const res = await apiFetch(objectsPath(kind, conversationId), {
      credentials: "include",
      signal: controller.signal,
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      // Only message objects participate in task execution / stream preload
      initialMessages = list
        .filter((item) => {
          if (!item || typeof item !== "object") return false;
          const kind = String(
            (item as { kind?: string }).kind ?? "message",
          ).toLowerCase();
          return kind !== "live_session";
        })
        .map((item) => normalizeMessage(item as Message));
    }
  } catch (err) {
    subscribeInFlight.delete(conversationId);
    options.signal?.removeEventListener("abort", onExternalAbort);
    if (isAbortError(err)) return "aborted";
    // ignore preload errors; stream will still start
  }

  // If this scheduled run already has an execution, do not open a stream.
  if (options.nextRunAt) {
    const runAtMs = new Date(options.nextRunAt).getTime();
    if (!Number.isNaN(runAtMs)) {
      const alreadyExecuted = initialMessages.some((m) => {
        const created = new Date(m.createdAt).getTime();
        return !Number.isNaN(created) && created >= runAtMs;
      });
      if (alreadyExecuted) {
        subscribeInFlight.delete(conversationId);
        options.signal?.removeEventListener("abort", onExternalAbort);
        return "already_executed";
      }
    }
  }

  let last = initialMessages[initialMessages.length - 1];

  // CRITICAL: if the latest assistant message is already terminal, there is
  // no backend task to subscribe to. Previously we injected a fake pending
  // message and still POSTed subscribe_to_task → 400 "no task found".
  if (
    last?.role === "assistant" &&
    (last.status === "completed" ||
      last.status === "error" ||
      last.status === "cancelled")
  ) {
    subscribeInFlight.delete(conversationId);
    options.signal?.removeEventListener("abort", onExternalAbort);
    notifyTaskRunning(conversationId, false);
    return "no_task";
  }

  // approval_required normally means "waiting for user".
  // Exception: forceRunning (isTaskRunning from list API) — user already
  // decided; objects may still lag as approval_required until stream updates.
  if (last?.role === "assistant" && last.status === "approval_required") {
    if (!options.forceRunning) {
      subscribeInFlight.delete(conversationId);
      options.signal?.removeEventListener("abort", onExternalAbort);
      notifyTaskRunning(conversationId, false);
      return "no_task";
    }
    initialMessages = initialMessages.map((m, i) =>
      i === initialMessages.length - 1
        ? {
            ...m,
            status: "pending" as const,
            pendingSkeleton: true,
          }
        : m,
    );
    last = initialMessages[initialMessages.length - 1];
  }

  if (!last || last.role !== "assistant" || last.status !== "pending") {
    // Only inject a pending placeholder when we still expect a live task
    // (e.g. empty conversation mid-handoff). Prefer not to subscribe blindly.
    if (kind === "chat" && last?.role === "assistant" && !options.forceRunning) {
      // Non-pending assistant without terminal status — do not invent work
      subscribeInFlight.delete(conversationId);
      options.signal?.removeEventListener("abort", onExternalAbort);
      notifyTaskRunning(conversationId, false);
      return "no_task";
    }
    initialMessages = [
      ...initialMessages,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        status: "pending",
        text: "",
        createdAt: new Date().toISOString(),
        pendingSkeleton: true,
        applyToolUse: async () => {},
      },
    ];
  } else if (
    last.status === "pending" &&
    !last.text &&
    !(last.steps && last.steps.length > 0)
  ) {
    // Resubscribe / reload: empty pending from objects → show skeleton until
    // the first stream event (not used for optimistic sendMessage path).
    initialMessages = initialMessages.map((m, i) =>
      i === initialMessages.length - 1
        ? { ...m, pendingSkeleton: true }
        : m,
    );
  }

  startChatStream(conversationId, initialMessages, controller);

  const updateLastAssistant = (updater: (m: Message) => Message) => {
    updateChatStreamMessages(conversationId, (prev) => {
      const index = prev.findLastIndex((m) => m.role === "assistant");
      if (index === -1) return prev;
      return prev.map((message, i) =>
        i === index ? updater(message) : message,
      );
    });
  };

  const clearPendingSkeleton = () => {
    updateChatStreamMessages(conversationId, (prev) => {
      const index = prev.findLastIndex((m) => m.role === "assistant");
      if (index === -1) return prev;
      const msg = prev[index]!;
      if (!msg.pendingSkeleton) return prev;
      return prev.map((message, i) =>
        i === index ? { ...message, pendingSkeleton: false } : message,
      );
    });
  };

  let result: SubscribeResult = "connected";
  let didConnect = false;

  try {
    await streamAI(
      apiUrl(`/api/conversations/subscribe_to_task`),
      { kind, conversationId },
      (event) => {
        if (!didConnect) {
          didConnect = true;
          notifyTaskRunning(conversationId, true);
        }
        applyStreamEvent(event, updateLastAssistant);
      },
      controller.signal,
      // Stream is open — leave "resubscribing" UI even if no steps yet
      () => {
        didConnect = true;
        notifyTaskRunning(conversationId, true);
        clearPendingSkeleton();
      },
    );
  } catch (err) {
    if (isAbortError(err)) {
      result = "aborted";
    } else {
      result = isNoActiveTaskError(err) ? "no_task" : "error";
      updateChatStreamMessages(conversationId, (prev) => {
        const lastMsg = prev[prev.length - 1];
        if (
          lastMsg?.role === "assistant" &&
          lastMsg.status === "pending" &&
          !lastMsg.text &&
          !(lastMsg.steps && lastMsg.steps.length > 0)
        ) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    }
  } finally {
    subscribeInFlight.delete(conversationId);
    options.signal?.removeEventListener("abort", onExternalAbort);

    const live = getStreamMessages(conversationId);
    if (live?.length) {
      setLastStreamSnapshot(conversationId, live);
    }

    endChatStream(conversationId);
    if (didConnect) {
      notifyTaskRunning(conversationId, false);
    }
    // Do not notify parent about aborted attempts (task switch / unmount)
    if (result !== "aborted") {
      options.onEnded?.(conversationId, result);
    }
  }

  return result;
}

/**
 * Ask backend to cancel the active task.
 * Returns true only when the API acknowledges success — callers should then
 * mark the local assistant message as stopped. On failure (agent already
 * finished in the race window), leave UI as-is.
 */
export async function cancelChatTask(
  conversationId: string,
  kind: ConversationKind = "chat",
): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/conversations/cancel_task`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, conversationId }),
    });
    if (!res.ok) {
      console.error("Failed to cancel conversation task", res.status);
      return false;
    }
  } catch (err) {
    console.error("Failed to cancel conversation task", err);
    return false;
  }

  const stoppedPayload = JSON.stringify({
    error_code: "STOPPED_BY_USER",
    status_code: 499,
  });

  updateChatStreamMessages(conversationId, (prev) => {
    const asstIndex = prev.findLastIndex(
      (m) =>
        m.role === "assistant" &&
        (m.status === "pending" ||
          m.status === "approval_required" ||
          m.status === "cancelled"),
    );
    if (asstIndex === -1) return prev;
    const userIndex = prev.findLastIndex(
      (m, i) => i < asstIndex && m.role === "user",
    );
    return prev.map((message, i) => {
      if (i === asstIndex) {
        const elapsedSec = Math.max(
          message.processingSeconds ?? 0,
          (Date.now() - new Date(message.createdAt).getTime()) / 1000,
        );
        return {
          ...message,
          status: "error" as const,
          text: stoppedPayload,
          streamingReasoning: undefined,
          pendingSkeleton: false,
          processingSeconds: Number.isFinite(elapsedSec) ? elapsedSec : message.processingSeconds,
        };
      }
      // Enable retry on the preceding user message (without "not sent" label)
      if (i === userIndex) {
        return { ...message, status: "error" as const, notSent: false };
      }
      return message;
    });
  });

  abortChatStream(conversationId);
  notifyTaskRunning(conversationId, false);
  return true;
}

export function resubscribeRunningTasks(
  items: Array<{ id: string; kind: ConversationKind }>,
  options: SubscribeToChatTaskOptions = {},
) {
  for (const item of items) {
    if (!isChatStreaming(item.id)) {
      void subscribeToChatTask(item.id, item.kind, {
        ...options,
        forceRunning: true,
      });
    }
  }
}

export function isStreamAbortError(err: unknown): boolean {
  return isAbortError(err);
}
