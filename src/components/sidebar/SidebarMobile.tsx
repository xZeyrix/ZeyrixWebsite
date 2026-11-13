"use client";

import { SidebarHeader } from "./SidebarHeader";
import { SidebarConversations } from "./SidebarConversations";
import { SidebarFooter } from "./SidebarFooter";
import { Conversation, ConversationKind } from "@/src/types/chat";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onExited: () => void;
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
  sidebarView: ConversationKind;
  onSidebarViewChange: (view: ConversationKind) => void;
};

export function SidebarMobile({
  open,
  onClose,
  onExited,
  chats,
  tasks,
  loading,
  renameConversation,
  deleteConversation,
  sidebarView,
  onSidebarViewChange,
}: SidebarProps) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ease-out motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"} lg:hidden`}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget || open) {
          return;
        }
        onExited();
      }}
    >
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-150 ease-out motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`
          absolute left-0 top-0 h-screen w-65 max-w-full bg-background flex flex-col transform-gpu
          transition-transform duration-150 ease-out motion-reduce:transition-none ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarHeader onClose={onClose} />
        <div className="flex-1 flex flex-col min-h-0">
          <SidebarConversations
            view={sidebarView}
            onViewChange={onSidebarViewChange}
            chats={chats}
            tasks={tasks}
            loading={loading}
            renameConversation={renameConversation}
            deleteConversation={deleteConversation}
            onClose={onClose}
          />
          <SidebarFooter />
        </div>
      </aside>
    </div>
  );
}
