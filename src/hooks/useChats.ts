import { Chat, ApiChat, mapChat } from "../types/chat";
import { useEffect, useState, useCallback, Dispatch, SetStateAction } from "react";
import { useConnection } from "../components/auth/ConnectionContext";
import { AccessInfoModalStatus } from "../components/modals/accessInfo";

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { state, auth } = useConnection();

  useEffect(() => {
    async function loadChats() {
      setLoading(true);
      setError(null);

      if (state !== "ready" || auth !== "authenticated") {
        return;
      }

      try {
        const res = await fetch("/api/chats/get_all_chats", {
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Backend вернул ${res.status}`);
        const data: ApiChat[] = await res.json();
        setChats(data.map(mapChat));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось загрузить чаты",
        );
      } finally {
        setLoading(false);
      }
    }

    loadChats();
  }, [state]);

  const createChat = useCallback(
    async (
      userPrompt: string,
      setComposeError: Dispatch<SetStateAction<"forbidden" | "chat-not-created" | null>>,
      setModalState: Dispatch<SetStateAction<AccessInfoModalStatus | null>>,
    ): Promise<string> => {
      setError(null);

      try {
        const res = await fetch("/api/chats/create", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_prompt: userPrompt }),
        });

        if (!res.ok) {
          const error = await res.json();

          if (error.code === "INVITE_REQUIRED") {
            setModalState(error.detail);
            setComposeError("forbidden");
          }

          throw new Error(error.code);
        }

        const data: ApiChat = await res.json();
        setChats((prev) => [mapChat(data), ...prev]);

        return data.id;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Failed to create a chat";

        if (error !== "INVITE_REQUIRED") {
          setComposeError("chat-not-created");
        }

        setError(error);
        throw err;
      }
    },
    [],
  );

  const renameChat = useCallback(
    async (chatId: string, newTitle: string): Promise<undefined> => {
      setError(null);

      try {
        const res = await fetch("/api/chats/rename", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: chatId,
            newTitle: newTitle,
          }),
        });

        if (!res.ok) throw new Error(`Backend вернул ${res.status}`);
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Не удалось переименовать чат";

        setError(error);
        throw err;
      }
    },
    [],
  );

  const deleteChat = useCallback(async (chatId: string): Promise<undefined> => {
    setError(null);

    try {
      const res = await fetch("/api/chats/delete", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chatId }),
      });

      if (!res.ok) throw new Error(`Backend вернул ${res.status}`);

      setChats((prev) => prev.filter((chat) => chat.id != chatId));
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Не удалось переименовать чат";

      setError(error);
      throw err;
    }
  }, []);

  return { chats, createChat, renameChat, deleteChat, loading };
}
