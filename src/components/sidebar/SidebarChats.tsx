"use client";

import DotsIcon from "@/src/icons/dots.svg";
import { Chat } from "@/src/types/chat";
import { usePathname, useRouter } from "next/navigation";
import RenameIcon from "@/src/icons/rename.svg";
import DeleteIcon from "@/src/icons/delete.svg";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { notifyChatRouteChanged, useChatRoute } from "@/src/hooks/useChatRoute";

type GlobalProps = {
  renameChat: (chatId: string, newTitle: string) => Promise<undefined>;
  deleteChat: (chatId: string) => Promise<undefined>;
  onClose?: () => void;
};

type GroupOfChatsProps = GlobalProps & {
  name: string;
  chats: Chat[];
};

type SidebarChatsProps = GlobalProps & {
  chats: Chat[];
  loading?: boolean;
};

type GroupedChats = {
  todayChats: Chat[];
  yesterdayChats: Chat[];
  lastDaysChats: Chat[];
  oldChats: Chat[];
};

type AIChatProps = Chat & GlobalProps;

function AIChat({ id, name, renameChat, deleteChat, onClose }: AIChatProps) {
  const t = useTranslations("chat");
  const router = useRouter();
  const pathname = usePathname();
  const currentChatId = useChatRoute(pathname);
  const isSelected = currentChatId === id;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [title, setTitle] = useState(name);
  const [isDeleting, setIsDeleting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLSpanElement>(null);

  const startRename = () => {
    setIsMenuOpen(false);
    setIsRenaming(true);
  };

  useEffect(() => {
    setTitle(name);
  }, [name]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      const clickedInsideMenu = menuRef.current?.contains(target);
      const clickedDots = dotsRef.current?.contains(target);

      if (clickedInsideMenu || clickedDots) return;

      setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const saveRename = async () => {
    const newTitle = title.trim();

    if (!newTitle || newTitle === name) {
      setTitle(name);
      setIsRenaming(false);
      return;
    }

    try {
      await renameChat(id, newTitle);

      setIsRenaming(false);
    } catch {
      setTitle(name);
      setIsRenaming(false);
    }
  };

  const cancelRename = () => {
    setTitle(name);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveRename();
    }

    if (e.key === "Escape") {
      cancelRename();
    }
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
          if (isSelected) {
            return;
          }
          
          const chatPath = pathname.slice(0, pathname.indexOf("/chat") + 5);
          window.history.pushState(
            {},
            "",
            `${chatPath}?chat=${encodeURIComponent(id)}`,
          );
          notifyChatRouteChanged();
          if (onClose) {onClose();}
        }}
      >
        {isRenaming ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleRenameKeyDown}
            onBlur={saveRename}
            className="text-body-sm text-foreground-secondary w-full border-none outline-none rounded-lg py-[3.5px]"
          />
        ) : (
          <p className="truncate text-body-sm text-foreground-secondary">
            {title}
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

      {isDeleting && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-999">
          <div className="bg-surface border-border p-6 rounded-2xl shadow-lg flex flex-col max-w-100 justify-center gap-3">
            <h3 className="text-foreground text-h3">{t("deleteModalTitle")}</h3>
            <p className="text-foreground-secondary text-body">
              {t("deleteModalText")}
            </p>
            <div className="flex flex-row justify-end gap-6">
              <button
                className="
                  border border-border rounded-lg px-5 py-3 text-foreground
                  hover:bg-elevated hover:cursor-pointer
                "
                onClick={(e) => {
                  setIsDeleting(false);
                }}
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
                    router.replace("/chat", {
                      scroll: false,
                    });
                    window.requestAnimationFrame(() => {
                      void deleteChat(id);
                    });
                    return;
                  }

                  void deleteChat(id);
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
  name,
  chats,
  renameChat,
  deleteChat,
  onClose,
}: GroupOfChatsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-caption text-foreground-muted">{name}</p>
      <div className="flex flex-col">
        {chats.map((chat) => (
          <AIChat
            key={chat.id}
            {...chat}
            renameChat={renameChat}
            deleteChat={deleteChat}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}

function groupChats(chats: Chat[]): GroupedChats {
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const todayChats: Chat[] = [];
  const yesterdayChats: Chat[] = [];
  const lastDaysChats: Chat[] = [];
  const oldChats: Chat[] = [];

  for (const chat of chats) {
    const createdAt = new Date(chat.updatedAt);

    if (createdAt >= todayStart) {
      todayChats.push(chat);
    } else if (createdAt >= yesterdayStart) {
      yesterdayChats.push(chat);
    } else if (createdAt >= sevenDaysAgo) {
      lastDaysChats.push(chat);
    } else {
      oldChats.push(chat);
    }
  }

  return {
    todayChats,
    yesterdayChats,
    lastDaysChats,
    oldChats,
  };
}

export function SidebarChats({
  chats,
  loading = false,
  deleteChat,
  renameChat,
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
        <p className="text-body text-error">{t("failedChats")}</p>
      </div>
    );
  }

  const { todayChats, yesterdayChats, lastDaysChats, oldChats } =
    groupChats(chats);

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-3 flex flex-col gap-3">
      {todayChats.length > 0 && (
        <GroupOfChats
          name={t("today")}
          chats={todayChats}
          renameChat={renameChat}
          deleteChat={deleteChat}
          onClose={onClose}
        />
      )}
      {yesterdayChats.length > 0 && (
        <GroupOfChats
          name={t("yesterday")}
          chats={yesterdayChats}
          renameChat={renameChat}
          deleteChat={deleteChat}
          onClose={onClose}
        />
      )}
      {lastDaysChats.length > 0 && (
        <GroupOfChats
          name={t("lastWeek")}
          chats={lastDaysChats}
          renameChat={renameChat}
          deleteChat={deleteChat}
          onClose={onClose}
        />
      )}
      {oldChats.length > 0 && (
        <GroupOfChats
          name={t("old")}
          chats={oldChats}
          renameChat={renameChat}
          deleteChat={deleteChat}
          onClose={onClose}
        />
      )}
    </div>
  );
}
