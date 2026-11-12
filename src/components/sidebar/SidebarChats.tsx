"use client";

import DotsIcon from "@/src/icons/dots.svg";
import { Chat, Conversation, ConversationKind } from "@/src/types/chat";
import { usePathname } from "next/navigation";
import RenameIcon from "@/src/icons/rename.svg";
import DeleteIcon from "@/src/icons/delete.svg";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import {
  clearConversationRoute,
  navigateToConversation,
  useChatRoute,
} from "@/src/hooks/useChatRoute";
import { useStreamingChatIds } from "@/src/hooks/chatStreamStore";

type GlobalProps = {
  kind: ConversationKind;
  renameConversation: (
    kind: ConversationKind,
    conversationId: string,
    newTitle: string,
  ) => Promise<undefined>;
  deleteConversation: (
    kind: ConversationKind,
    conversationId: string,
  ) => Promise<undefined>;
  onClose?: () => void;
};

type GroupOfChatsProps = GlobalProps & {
  title: string;
  chats: Conversation[];
};

type SidebarChatsProps = GlobalProps & {
  chats: Conversation[];
  loading?: boolean;
};

type GroupedChats = {
  todayChats: Conversation[];
  yesterdayChats: Conversation[];
  lastDaysChats: Conversation[];
  oldChats: Conversation[];
};

type AIChatProps = Conversation & GlobalProps;

function AIChat({
  id,
  title,
  isTaskRunning,
  kind,
  renameConversation,
  deleteConversation,
  onClose,
}: AIChatProps) {
  const t = useTranslations("chat");
  const pathname = usePathname();
  const route = useChatRoute(pathname);
  const isSelected = route?.id === id && route.kind === kind;
  const streamingChatIds = useStreamingChatIds();
  const isGenerating = streamingChatIds.has(id) || isTaskRunning;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [chatTitle, setTitle] = useState(title);
  const [isDeleting, setIsDeleting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLSpanElement>(null);

  const startRename = () => {
    setIsMenuOpen(false);
    setIsRenaming(true);
  };

  useEffect(() => {
    setTitle(title);
  }, [title]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const clickedInsideMenu = menuRef.current?.contains(target);
      const clickedDots = dotsRef.current?.contains(target);
      if (clickedInsideMenu || clickedDots) return;
      setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const saveRename = async () => {
    const newTitle = chatTitle.trim();
    if (!newTitle || newTitle === title) {
      setTitle(title);
      setIsRenaming(false);
      return;
    }

    try {
      await renameConversation(kind, id, newTitle);
      setIsRenaming(false);
    } catch {
      setTitle(title);
      setIsRenaming(false);
    }
  };

  const cancelRename = () => {
    setTitle(title);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") saveRename();
    if (e.key === "Escape") cancelRename();
  };

  return (
    <>
      <button
        className={`
                relative group
                flex flex-row justify-between pl-2 py-1.5 items-center w-full rounded-md
                ${isSelected && "bg-surface border-l-2 border-primary"}
                ${!isRenaming && "hover:cursor-pointer"}
                ${!isSelected && "hover:bg-elevated"}
                ${isRenaming && "border border-primary"}
            `}
        onClick={() => {
          if (isSelected) return;
          navigateToConversation(kind, id, pathname);
          onClose?.();
        }}
      >
        {isRenaming ? (
          <input
            ref={inputRef}
            value={chatTitle}
            onChange={(e) => setTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleRenameKeyDown}
            onBlur={saveRename}
            className="text-body-sm text-foreground-secondary w-full border-none outline-none rounded-lg py-[3.5px]"
          />
        ) : (
          <p className="truncate text-body-sm text-foreground-secondary flex items-center gap-2 min-w-0">
            {isGenerating && !isSelected && (
              <span
                className="relative flex size-2 shrink-0"
                title="Generating"
                aria-label="Generating"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            )}
            <span className="truncate">{chatTitle}</span>
          </p>
        )}

        <span
          className={`
            p-2
            rounded-lg
            hover:bg-border

            opacity-100
            [@media(hover:hover)]:opacity-0
            [@media(hover:hover)]:group-hover:opacity-100

            ${isMenuOpen ? "bg-border" : ""}
            ${isRenaming ? "hidden" : ""}
          `}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsMenuOpen((prev) => !prev);
          }}
          ref={dotsRef}
        >
          <DotsIcon className="text-foreground size-3" />
        </span>

        {isMenuOpen && (
          <div
            className="
                        absolute top-10 right-0 z-50
                        p-1 bg-elevated border border-border rounded-lg
                        flex flex-col w-fit h-fit gap-1 cursor-default
                    "
            onClick={(e) => {
              e.stopPropagation();
            }}
            ref={menuRef}
          >
            <span
              className="
                            flex items-center px-3 py-2 gap-3 hover:bg-border rounded-lg
                            hover:cursor-pointer
                        "
              onClick={(e) => {
                e.stopPropagation();
                startRename();
              }}
            >
              <RenameIcon className="text-foreground size-4" />
              <p className="text-foreground text-body">{t("rename")}</p>
            </span>

            <span
              className="
                            flex items-center px-3 py-2 gap-3 rounded-lg text-error
                            hover:bg-error/80 hover:text-foreground hover:cursor-pointer
                        "
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                setIsDeleting(true);
              }}
            >
              <DeleteIcon className="size-4" />
              <p className="text-body">{t("delete")}</p>
            </span>
          </div>
        )}
      </button>

      {isDeleting &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-999">
            <div className="bg-surface border-border p-6 rounded-2xl shadow-lg flex flex-col max-w-100 justify-center gap-3">
              <h3 className="text-foreground text-h3">
                {t("deleteModalTitle")}
              </h3>
              <p className="text-foreground-secondary text-body">
                {kind === "task"
                  ? t("deleteModalTextTask")
                  : t("deleteModalText")}
              </p>
              <div className="flex flex-row justify-end gap-6">
                <button
                  className="
                  border border-border rounded-lg px-5 py-3 text-foreground
                  hover:bg-elevated hover:cursor-pointer
                "
                  onClick={() => setIsDeleting(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  className="
                  bg-error/80 text-foreground rounded-lg px-5 py-3
                  hover:bg-error hover:cursor-pointer
                "
                  onClick={() => {
                    setIsDeleting(false);
                    if (isSelected) {
                      clearConversationRoute(pathname);
                    }
                    void deleteConversation(kind, id);
                  }}
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function GroupOfChats({
  title,
  chats,
  kind,
  renameConversation,
  deleteConversation,
  onClose,
}: GroupOfChatsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-caption text-foreground-muted">{title}</p>
      <div className="flex flex-col">
        {chats.map((chat) => (
          <AIChat
            key={chat.id}
            {...chat}
            kind={kind}
            renameConversation={renameConversation}
            deleteConversation={deleteConversation}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}

function groupChats(chats: Conversation[]): GroupedChats {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const todayChats: Conversation[] = [];
  const yesterdayChats: Conversation[] = [];
  const lastDaysChats: Conversation[] = [];
  const oldChats: Conversation[] = [];

  for (const chat of chats) {
    const createdAt = new Date(chat.updatedAt);
    if (createdAt >= todayStart) todayChats.push(chat);
    else if (createdAt >= yesterdayStart) yesterdayChats.push(chat);
    else if (createdAt >= sevenDaysAgo) lastDaysChats.push(chat);
    else oldChats.push(chat);
  }

  return { todayChats, yesterdayChats, lastDaysChats, oldChats };
}

export function SidebarChats({
  chats,
  kind,
  loading = false,
  deleteConversation,
  renameConversation,
  onClose,
}: SidebarChatsProps) {
  const t = useTranslations("sidebarChats");

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pt-3 flex flex-col gap-3">
        <div className="h-3 w-16 animate-pulse rounded bg-surface" />
        {[0, 1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="relative h-8 overflow-hidden rounded-md bg-surface"
          >
            <div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-white/10 to-transparent" />
          </div>
        ))}
      </div>
    );
  }

  if (!chats) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pt-3 flex flex-col gap-3">
        <p className="text-body text-error">
          {kind === "task" ? t("failedTasks") : t("failedChats")}
        </p>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pt-3 flex flex-col gap-3">
        <p className="text-body-sm text-foreground-muted">
          {kind === "task" ? t("emptyTasks") : t("emptyChats")}
        </p>
      </div>
    );
  }

  const { todayChats, yesterdayChats, lastDaysChats, oldChats } =
    groupChats(chats);

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-3 flex flex-col gap-3">
      {todayChats.length > 0 && (
        <GroupOfChats
          title={t("today")}
          chats={todayChats}
          kind={kind}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          onClose={onClose}
        />
      )}
      {yesterdayChats.length > 0 && (
        <GroupOfChats
          title={t("yesterday")}
          chats={yesterdayChats}
          kind={kind}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          onClose={onClose}
        />
      )}
      {lastDaysChats.length > 0 && (
        <GroupOfChats
          title={t("lastWeek")}
          chats={lastDaysChats}
          kind={kind}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          onClose={onClose}
        />
      )}
      {oldChats.length > 0 && (
        <GroupOfChats
          title={t("old")}
          chats={oldChats}
          kind={kind}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          onClose={onClose}
        />
      )}
    </div>
  );
}
