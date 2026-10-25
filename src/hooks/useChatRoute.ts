"use client";

import { useEffect, useState } from "react";

function readChatId(pathname: string) {
  const pathSegments = pathname.split("/").filter(Boolean);
  const chatSegmentIndex = pathSegments.indexOf("chat");
  const pathChatId =
    chatSegmentIndex >= 0 ? pathSegments[chatSegmentIndex + 1] : undefined;

  if (typeof window === "undefined") return pathChatId;
  return new URLSearchParams(window.location.search).get("chat") ?? pathChatId;
}

export function notifyChatRouteChanged() {
  window.dispatchEvent(new Event("chat-route-change"));
}

export function useChatRoute(pathname: string) {
  const [chatId, setChatId] = useState<string | undefined>(() =>
    readChatId(pathname),
  );

  useEffect(() => {
    const update = () => setChatId(readChatId(pathname));
    update();
    window.addEventListener("popstate", update);
    window.addEventListener("chat-route-change", update);

    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("chat-route-change", update);
    };
  }, [pathname]);

  return chatId;
}
