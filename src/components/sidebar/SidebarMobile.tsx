"use client";

import { SidebarHeader } from "./SidebarHeader";
import { SidebarConversations } from "./SidebarConversations";
import { SidebarFooter } from "./SidebarFooter";
import { Conversation, ConversationKind } from "@/src/types/chat";
import { SidebarContext } from "./SidebarContext";

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
  // Mobile drawer is always "expanded" for label visibility
  const sidebarValue = { expanded: true, toggle: () => {} };

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
          absolute left-0 top-0 h-dvh max-h-dvh w-65 max-w-full
          bg-background flex flex-col transform-gpu
          transition-transform duration-150 ease-out motion-reduce:transition-none
          ${open ? "translate-x-0" : "-translate-x-full"}
          pb-[env(safe-area-inset-bottom,0px)]
        `}
      >
        <SidebarContext.Provider value={sidebarValue}>
          <div className="shrink-0">
            <SidebarHeader onClose={onClose} />
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
          </div>

          {/* Footer outside the scroll area so it never sinks under the viewport */}
          <div className="shrink-0">
            <SidebarFooter />
          </div>
        </SidebarContext.Provider>
      </aside>
    </div>
  );
}
