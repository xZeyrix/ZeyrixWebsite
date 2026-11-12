"use client";

import { Conversation, ConversationKind } from "@/src/types/chat";
import { SidebarChats } from "./SidebarChats";
import { useTranslations } from "next-intl";
import { useSidebar } from "./SidebarContext";

type SidebarConversationsProps = {
  view: ConversationKind;
  onViewChange: (view: ConversationKind) => void;
  chats: Conversation[];
  tasks: Conversation[];
  loading?: boolean;
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

export function SidebarConversations({
  view,
  onViewChange,
  chats,
  tasks,
  loading,
  renameConversation,
  deleteConversation,
  onClose,
}: SidebarConversationsProps) {
  const t = useTranslations("sidebarChats");
  const { expanded } = useSidebar();

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div
        className={`
          px-3 pb-2
          transition-opacity duration-150
          ${expanded ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      >
        <div className="flex rounded-lg bg-surface p-1 gap-1">
          <button
            type="button"
            onClick={() => onViewChange("chat")}
            className={`
              flex-1 rounded-md px-3 py-1.5 text-btn transition
              hover:cursor-pointer
              ${
                view === "chat"
                  ? "bg-elevated text-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              }
            `}
          >
            {t("tabChats")}
          </button>
          <button
            type="button"
            onClick={() => onViewChange("task")}
            className={`
              flex-1 rounded-md px-3 py-1.5 text-btn transition
              hover:cursor-pointer
              ${
                view === "task"
                  ? "bg-elevated text-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              }
            `}
          >
            {t("tabTasks")}
          </button>
        </div>
      </div>

      {/* Keep both mounted so switching tabs does not remount list state */}
      <div className={view === "chat" ? "flex flex-1 min-h-0 flex-col" : "hidden"}>
        <SidebarChats
          kind="chat"
          chats={chats}
          loading={loading}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          onClose={onClose}
        />
      </div>
      <div className={view === "task" ? "flex flex-1 min-h-0 flex-col" : "hidden"}>
        <SidebarChats
          kind="task"
          chats={tasks}
          loading={loading}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
