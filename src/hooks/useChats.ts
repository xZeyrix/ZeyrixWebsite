import {
  Chat,
  Conversation,
  ConversationKind,
  ChatsAndScheduledTasks,
} from "../types/chat";
import {
  useEffect,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";
import { useConnection } from "../components/auth/ConnectionContext";
import { AccessInfoModalStatus } from "../components/modals/accessInfo";
import { apiFetch } from "../lib/api";
import {
  isChatStreaming,
  subscribeTaskRunningFlags,
} from "./chatStreamStore";
import {
  resubscribeRunningTasks,
  subscribeToChatTask,
} from "../lib/chatTaskStream";

function normalizeConversation(raw: any): Conversation {
  return {
    id: String(raw.id),
    title: raw.title ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
    isTaskRunning: Boolean(
      raw.isTaskRunning ?? raw.is_task_running ?? false,
    ),
  };
}

export function useChats() {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [tasks, setTasks] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { state, auth } = useConnection();

  const markTaskRunning = useCallback(
    (conversationId: string, running: boolean) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, isTaskRunning: running } : c,
        ),
      );
      setTasks((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, isTaskRunning: running } : c,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    return subscribeTaskRunningFlags(markTaskRunning);
  }, [markTaskRunning]);

  useEffect(() => {
    async function loadConversations() {
      setLoading(true);
      setError(null);

      if (state !== "ready" || auth !== "authenticated") {
        return;
      }

      try {
        const res = await apiFetch("/api/conversations/", {
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        const data: ChatsAndScheduledTasks = await res.json();

        const nextChats = (data.chats ?? []).map(normalizeConversation);
        const nextTasks = (data.tasks ?? []).map(normalizeConversation);
        setChats(nextChats);
        setTasks(nextTasks);

        const runningChatIds = nextChats
          .filter((c) => c.isTaskRunning && !isChatStreaming(c.id))
          .map((c) => ({ id: c.id, kind: "chat" as const }));
        const runningTaskIds = nextTasks
          .filter((c) => c.isTaskRunning && !isChatStreaming(c.id))
          .map((c) => ({ id: c.id, kind: "task" as const }));

        resubscribeRunningTasks([...runningChatIds, ...runningTaskIds], {
          onEnded: (conversationId) => markTaskRunning(conversationId, false),
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load conversations",
        );
      } finally {
        setLoading(false);
      }
    }

    loadConversations();
  }, [state, auth, markTaskRunning]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible") return;

      const resubscribe = (
        items: Conversation[],
        kind: ConversationKind,
      ) => {
        for (const item of items) {
          if (item.isTaskRunning && !isChatStreaming(item.id)) {
            void subscribeToChatTask(item.id, kind, {
              onEnded: (conversationId) =>
                markTaskRunning(conversationId, false),
            });
          }
        }
      };

      setChats((prev) => {
        resubscribe(prev, "chat");
        return prev;
      });
      setTasks((prev) => {
        resubscribe(prev, "task");
        return prev;
      });
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, [markTaskRunning]);

  const createChat = useCallback(
    async (
      userPrompt: string,
      setComposeError: Dispatch<
        SetStateAction<"forbidden" | "chat-not-created" | null>
      >,
      setModalState: Dispatch<SetStateAction<AccessInfoModalStatus | null>>,
    ): Promise<string> => {
      setError(null);
      setCreating(true);

      try {
        const res = await apiFetch("/api/conversations/create", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "chat",
            title: "",
            user_prompt: userPrompt,
          }),
        });

        if (!res.ok) {
          const error = await res.json();

          if (error.code === "INVITE_REQUIRED") {
            setModalState(error.detail);
            setComposeError("forbidden");
          }

          throw new Error(error.code);
        }

        const data = normalizeConversation(await res.json());
        setChats((prev) => [{ ...data, isTaskRunning: true }, ...prev]);

        return data.id;
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to create a chat";

        if (error !== "INVITE_REQUIRED") {
          setComposeError("chat-not-created");
        }

        setError(error);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [],
  );

  const renameConversation = useCallback(
    async (
      kind: ConversationKind,
      conversationId: string,
      newTitle: string,
    ): Promise<undefined> => {
      setError(null);

      try {
        const res = await apiFetch("/api/conversations/rename", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            conversationId,
            newTitle,
          }),
        });

        if (!res.ok) throw new Error(`Backend returned ${res.status}`);

        const applyTitle = (prev: Conversation[]) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, title: newTitle } : c,
          );

        if (kind === "chat") setChats(applyTitle);
        else setTasks(applyTitle);
      } catch (err) {
        const error =
          err instanceof Error
            ? err.message
            : "Failed to rename the conversation";
        setError(error);
        throw err;
      }
    },
    [],
  );

  const deleteConversation = useCallback(
    async (
      kind: ConversationKind,
      conversationId: string,
    ): Promise<undefined> => {
      setError(null);

      let snapshot: Conversation[] = [];
      const filterOut = (prev: Conversation[]) => {
        snapshot = prev;
        return prev.filter((c) => c.id !== conversationId);
      };

      if (kind === "chat") setChats(filterOut);
      else setTasks(filterOut);

      try {
        const res = await apiFetch("/api/conversations/delete", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            conversationId,
          }),
        });

        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      } catch (err) {
        if (kind === "chat") setChats(snapshot);
        else setTasks(snapshot);

        const error =
          err instanceof Error
            ? err.message
            : "Failed to delete the conversation";
        setError(error);
        throw err;
      }
    },
    [],
  );

  // Backwards-compatible aliases used by existing call sites during migration
  const renameChat = useCallback(
    (chatId: string, newTitle: string) =>
      renameConversation("chat", chatId, newTitle),
    [renameConversation],
  );
  const deleteChat = useCallback(
    (chatId: string) => deleteConversation("chat", chatId),
    [deleteConversation],
  );

  return {
    chats,
    tasks,
    createChat,
    renameConversation,
    deleteConversation,
    renameChat,
    deleteChat,
    loading,
    creating,
    error,
  };
}
