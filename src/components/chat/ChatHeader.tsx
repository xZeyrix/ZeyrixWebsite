"use client";

import { useState } from "react";
import SidebarIcon from "@/src/icons/sidebar.svg";
import CloseIcon from "@/src/icons/close.svg";
import { SidebarMobile } from "../sidebar/SidebarMobile";
import { Chat } from "@/src/types/chat";
import { useRouter } from "next/navigation"; 

type ChatHeaderProps = {
  chats: Chat[];
  renameChat: (chatId: string, newTitle: string) => Promise<undefined>;
  deleteChat: (chatId: string) => Promise<undefined>;
};

export function ChatHeader({ chats, renameChat, deleteChat }: ChatHeaderProps) {
  const [isSideBarOpen, setIsSideBarOpen] = useState(false);
  const [isSidebarMounted, setIsSidebarMounted] = useState(false);
  const router = useRouter();

  const openSidebar = () => {
    setIsSidebarMounted(true);
    setIsSideBarOpen(false);

    window.requestAnimationFrame(() => {
      setIsSideBarOpen(true);
    });
  };
  const closeSidebar = () => setIsSideBarOpen(false);
  const handleSidebarExited = () => setIsSidebarMounted(false);

  return (
    <div className="bg-background h-fit w-full flex justify-between items-center px-2 py-3 border-b border-border">
      <div className="p-3 lg:hidden" onClick={openSidebar}>
        <SidebarIcon className="text-foreground-muted size-5" />
      </div>
      <h4 className="text-foreground font-sans text-h4 px-3">Zeyrix AI</h4>
      <div 
        className="p-3.5"
        onClick={() => router.back()}
      >
        <CloseIcon className="text-foreground-muted size-4" />
      </div>

      {isSidebarMounted && (
        <SidebarMobile
          open={isSideBarOpen}
          onClose={closeSidebar}
          onExited={handleSidebarExited}
          chats={chats}
          renameChat={renameChat}
          deleteChat={deleteChat}
        />
      )}
    </div>
  );
}
