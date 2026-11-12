"use client";

import { useEffect, useState } from "react";
import type { ConversationKind } from "../types/chat";

export type ConversationRoute = {
  kind: ConversationKind;
  id: string;
} | null;

function readConversationRoute(pathname: string): ConversationRoute {
  if (typeof window === "undefined") {
    const pathSegments = pathname.split("/").filter(Boolean);
    const chatSegmentIndex = pathSegments.indexOf("chat");
    const pathChatId =
      chatSegmentIndex >= 0 ? pathSegments[chatSegmentIndex + 1] : undefined;
    return pathChatId ? { kind: "chat", id: pathChatId } : null;
  }

  const params = new URLSearchParams(window.location.search);
  const taskId = params.get("task");
  if (taskId) return { kind: "task", id: taskId };
  const chatId = params.get("chat");
  if (chatId) return { kind: "chat", id: chatId };

  const pathSegments = pathname.split("/").filter(Boolean);
  const chatSegmentIndex = pathSegments.indexOf("chat");
  const pathChatId =
    chatSegmentIndex >= 0 ? pathSegments[chatSegmentIndex + 1] : undefined;
  return pathChatId ? { kind: "chat", id: pathChatId } : null;
}

export function notifyChatRouteChanged() {
  window.dispatchEvent(new Event("chat-route-change"));
}

export function useChatRoute(pathname: string): ConversationRoute {
  const [route, setRoute] = useState<ConversationRoute>(() =>
    readConversationRoute(pathname),
  );

  useEffect(() => {
    const update = () => setRoute(readConversationRoute(pathname));
    update();
    window.addEventListener("popstate", update);
    window.addEventListener("chat-route-change", update);

    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("chat-route-change", update);
    };
  }, [pathname]);

  return route;
}

/** Navigate to a conversation without full page reload */
export function navigateToConversation(
  kind: ConversationKind,
  id: string,
  pathname: string,
) {
  const chatIdx = pathname.indexOf("/chat");
  const chatPath =
    chatIdx >= 0 ? pathname.slice(0, chatIdx + 5) : pathname;
  const param = kind === "task" ? "task" : "chat";
  window.history.pushState(
    {},
    "",
    `${chatPath}?${param}=${encodeURIComponent(id)}`,
  );
  notifyChatRouteChanged();
}

export function clearConversationRoute(pathname: string) {
  const chatIdx = pathname.indexOf("/chat");
  const chatPath =
    chatIdx >= 0 ? pathname.slice(0, chatIdx + 5) : pathname;
  window.history.replaceState({}, "", chatPath);
  notifyChatRouteChanged();
}
