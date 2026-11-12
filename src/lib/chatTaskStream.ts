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
          event.kind === "reasoning" ? undefined : message.streamingReasoning,
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

export type SubscribeToChatTaskOptions = {
  onEnded?: (conversationId: string) => void;
};

function objectsPath(kind: ConversationKind, conversationId: string) {
  const segment = kind === "task" ? "tasks" : "chats";
  return `/api/conversations/${segment}/${conversationId}/objects`;
}

export async function subscribeToChatTask(
  conversationId: string,
  kind: ConversationKind = "chat",
  options: SubscribeToChatTaskOptions = {},
): Promise<void> {
  if (isChatStreaming(conversationId)) return;

  const controller = new AbortController();

  let initialMessages: Message[] = [];
  try {
    const res = await apiFetch(objectsPath(kind, conversationId), {
      credentials: "include",
      signal: controller.signal,
    });
    if (res.ok) {
      const data = await res.json();
      initialMessages = (Array.isArray(data) ? data : []).map(normalizeMessage);
    }
  } catch {
    // ignore preload errors; stream will still start
  }

  const last = initialMessages[initialMessages.length - 1];
  if (
    !last ||
    last.role !== "assistant" ||
    (last.status !== "pending" && last.status !== "approval_required")
  ) {
    initialMessages = [
      ...initialMessages,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        status: "pending",
        text: "",
        createdAt: new Date().toISOString(),
        applyToolUse: async () => {},
      },
    ];
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

  try {
    await streamAI(
      apiUrl(`/api/conversations/subscribe_to_task`),
      { kind, conversationId },
      (event) => applyStreamEvent(event, updateLastAssistant),
      controller.signal,
    );
  } catch (err) {
    if (isAbortError(err)) {
      return;
    }
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
  } finally {
    const live = getStreamMessages(conversationId);
    if (live?.length) {
      setLastStreamSnapshot(conversationId, live);
    }

    endChatStream(conversationId);
    notifyTaskRunning(conversationId, false);
    options.onEnded?.(conversationId);
  }
}

export async function cancelChatTask(
  conversationId: string,
  kind: ConversationKind = "chat",
): Promise<void> {
  try {
    await apiFetch(`/api/conversations/cancel_task`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, conversationId }),
    });
  } catch (err) {
    console.error("Failed to cancel conversation task", err);
  }

  updateChatStreamMessages(conversationId, (prev) =>
    prev.map((message, index) => {
      if (index === prev.findLastIndex((m) => m.role === "assistant")) {
        return { ...message, status: "cancelled" };
      }
      return message;
    }),
  );

  abortChatStream(conversationId);
  notifyTaskRunning(conversationId, false);
}

export function resubscribeRunningTasks(
  items: Array<{ id: string; kind: ConversationKind }>,
  options: SubscribeToChatTaskOptions = {},
) {
  for (const item of items) {
    if (!isChatStreaming(item.id)) {
      void subscribeToChatTask(item.id, item.kind, options);
    }
  }
}

export function isStreamAbortError(err: unknown): boolean {
  return isAbortError(err);
}
