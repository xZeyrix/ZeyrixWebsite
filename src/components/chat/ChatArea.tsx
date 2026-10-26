"use client";
import { Message, Attachment } from "@/src/types/chat";
import { useConnection } from "../auth/ConnectionContext";
import { MessageBubble } from "./MessageBubble";
import MainLogo from "@/public/icons/logoMain.svg";
import { useRef, useLayoutEffect, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SetStateAction, Dispatch } from "react";

type ChatAreaProps = {
  chatId?: string;
  loading: boolean;
  messages: Message[];
  error: string | null;
  compactEmptyState?: boolean;
  applyToolUse: (
    requestId: string,
    action: "confirm" | "reject",
  ) => Promise<void>;
  retrySendMessage: (
    id: string,
    prompt: string,
    attachments: Attachment[],
    deleteFromLocal: boolean,
  ) => void;
  closeToBottom: boolean;
  shouldScroll: boolean;
  setCloseToBottom: Dispatch<SetStateAction<boolean>>;
  setShouldScroll: Dispatch<SetStateAction<boolean>>;
  reloadMessages: () => void;
};

export function ChatArea({
  loading,
  messages,
  compactEmptyState,
  chatId,
  applyToolUse,
  error,
  retrySendMessage,
  closeToBottom,
  shouldScroll,
  setCloseToBottom,
  setShouldScroll,
  reloadMessages,
}: ChatAreaProps) {
  const t = useTranslations("chatArea");

  const { state } = useConnection();
  const isConnectionLoading = state !== "ready";
  
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevChatIdRef = useRef<string | undefined>(undefined);
  const prevMessagesLenRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);

  const pendingInstantScrollRef = useRef(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const showLoading = isConnectionLoading || loading;
  const showEmptyState =
    !showLoading && messages.length === 0 && compactEmptyState;
  const showMessages = !showLoading && !showEmptyState;

  useEffect(() => {
    if (shouldScroll) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });

      setShouldScroll(false);
    }
  }, [shouldScroll]);

  useEffect(() => {
    if (!showMessages) return;
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < 150;

      setCloseToBottom(distanceFromBottom < 150);
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [showMessages]);

  useLayoutEffect(() => {
    if (prevChatIdRef.current === chatId) return;
    prevChatIdRef.current = chatId;
    prevMessagesLenRef.current = 0;
    shouldAutoScrollRef.current = true;
    pendingInstantScrollRef.current = true;

    setIsSettling(true);
    setIsVisible(false);
  }, [chatId]);

  useLayoutEffect(() => {
    if (!showMessages) return;
    const container = containerRef.current;
    if (!container) return;

    const isChatSwitch = pendingInstantScrollRef.current;
    const messagesGrew = messages.length > prevMessagesLenRef.current;
    prevMessagesLenRef.current = messages.length;

    if (!isChatSwitch && !messagesGrew) return;
    if (!isChatSwitch && !shouldAutoScrollRef.current) return;

    if (isChatSwitch) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;

          containerRef.current.scrollTop = containerRef.current.scrollHeight;
          pendingInstantScrollRef.current = false;
          setIsSettling(false);

          requestAnimationFrame(() => {
            setIsVisible(true);
          });
        });
      });
    } else {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, showMessages, chatId]);

  if (showLoading) {
    return (
      <div className="w-full h-full overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-190 flex-col gap-6">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className={`flex ${item % 2 === 0 ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`relative h-16 w-2/3 overflow-hidden rounded-2xl bg-surface ${
                  item % 2 === 0 ? "rounded-tl-sm" : "rounded-tr-sm"
                }`}
              >
                <div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-white/10 to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (showEmptyState) {
    const titles = [
      t("title1"),
      t("title2"),
      t("title3"),
      t("title4"),
      t("title5"),
      t("title6"),
    ];
    const randomItem = titles[Math.floor(Math.random() * titles.length)];

    return (
      <h1 className="font-display-ru text-display text-foreground-secondary text-[clamp(2rem,5vw,3rem)] text-center px-6 max-w-[95vw]">
        <MainLogo className="inline-block text-[clamp(2rem,5vw,3rem)] shrink-0 text-primary mr-3 align-middle" />
        {randomItem}
      </h1>
    );
  }

  const handleTryAgain = () => {
    pendingInstantScrollRef.current = true;
    shouldAutoScrollRef.current = true;
    setIsSettling(true);
    setIsVisible(false);
    reloadMessages();
  };

  return (
    <div
      ref={containerRef}
      key={chatId}
      className="w-full h-full px-6 overflow-y-auto py-3"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: isSettling ? "none" : "opacity 90ms ease-out",
        scrollbarGutter: "stable",
      }}
    >
      <div className="flex justify-center">
        <div className="max-w-190 w-full flex flex-col gap-3 py-3">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              {...message}
              applyToolUse={applyToolUse}
              retrySendMessage={retrySendMessage}
              setShouldScroll={setShouldScroll}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {messages.length === 0 && error && (
        <div className="flex flex-col gap-5 justify-center items-center min-h-[calc(100%-1.5rem)] min-w-0">
          <div className="flex flex-col gap-2 items-center">
            <h3 className="text-foreground text-h3">{t("failedTitle")}</h3>
            <p className="text-foreground-secondary text-body text-center">{t("failedDescription")}</p>
          </div>

          <button 
            className="bg-primary rounded-lg px-5 py-3 text-background hover:cursor-pointer hover:bg-primary-hover"
            onClick={handleTryAgain}
          >
            {t("tryAgainButton")}
          </button>
        </div>
      )}
    </div>
  );
}
