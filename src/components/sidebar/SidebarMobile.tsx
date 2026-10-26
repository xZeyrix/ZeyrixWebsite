import { SidebarHeader } from "./SidebarHeader";
import { SidebarChats } from "./SidebarChats";
import { SidebarFooter } from "./SidebarFooter";
import { Chat } from "@/src/types/chat";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onExited: () => void;
  chats: Chat[];
  loading?: boolean;
  renameChat: (chatId: string, newTitle: string) => Promise<undefined>;
  deleteChat: (chatId: string) => Promise<undefined>;
};

export function SidebarMobile({
  open,
  onClose,
  onExited,
  chats,
  loading,
  renameChat,
  deleteChat,
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
          <SidebarChats
            chats={chats}
            loading={loading}
            renameChat={renameChat}
            deleteChat={deleteChat}
            onClose={onClose}
          />
          <SidebarFooter />
        </div>
      </aside>
    </div>
  );
}
