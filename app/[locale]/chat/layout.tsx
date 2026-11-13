"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useChats } from "@/src/hooks/useChats";
import { ChatHeader } from "@/src/components/chat/ChatHeader";
import { SidebarDesktop } from "@/src/components/sidebar/SidebarDesktop";
import { SidebarConversations } from "@/src/components/sidebar/SidebarConversations";
import ChatClient from "./ChatClient";
import ChatNotFound from "./ChatNotFound";
import { useConnection } from "@/src/components/auth/ConnectionContext";
import LockIcon from "@/src/icons/lock.svg";
import { GetAccessModal } from "@/src/components/modals/getAccess";
import { useTranslations } from "next-intl";
import ErrorIcon from "@/src/icons/warning.svg";
import { useChatRoute } from "@/src/hooks/useChatRoute";
import { ConversationKind } from "@/src/types/chat";

export default function ChatLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("accessDisabled");
  const connectionErrorT = useTranslations("connectionError");

  const {
    chats,
    tasks,
    createChat,
    renameConversation,
    deleteConversation,
    loading,
    creating,
    refreshTasks,
  } = useChats();
  const [isGetAccessModalOpen, setIsGetAccessModalOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<ConversationKind>("chat");

  const { state, access, auth, retryAuth } = useConnection();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const isLoading = state !== "ready" || loading;

  useEffect(() => {
    if (auth !== "needs_auth") return;
    const next = encodeURIComponent(pathname);
    router.replace(`/login?next=${next}`);
  }, [auth, locale, pathname, router]);

  const route = useChatRoute(pathname);

  // Sync sidebar tab with current route kind
  useEffect(() => {
    if (route?.kind) setSidebarView(route.kind);
  }, [route?.kind]);

  const isConversationExist = route
    ? route.kind === "chat"
      ? chats.some((c) => c.id === route.id)
      : tasks.some((c) => c.id === route.id)
    : true;

  const currentList = route?.kind === "task" ? tasks : chats;
  const currentConversation = route
    ? currentList.find((c) => c.id === route.id)
    : undefined;

  if (auth === "error") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-error/30 bg-error/10 text-2xl text-error">
            <ErrorIcon className="size-5" />
          </div>
          <h1 className="text-h2 text-foreground">
            {connectionErrorT("title")}
          </h1>
          <p className="text-body-sm text-foreground-muted">
            {connectionErrorT("text")}
          </p>
          <button
            type="button"
            onClick={retryAuth}
            className="rounded-xl bg-primary px-5 py-3 text-btn text-background transition hover:bg-primary-hover hover:cursor-pointer"
          >
            {connectionErrorT("button")}
          </button>
        </div>
      </div>
    );
  }

  if (auth !== "authenticated") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <>
      {!isConversationExist && !isLoading ? (
        <ChatNotFound />
      ) : (
        <div className="flex flex-col h-dvh w-full">
          {access === "disabled" && (
            <div className="bg-warning text-background h-fit flex flex-col sm:flex-row sm:h-12 justify-between items-center shrink-0 px-6 py-1 gap-1">
              <div className="flex flex-row gap-3 items-center min-w-0 max-w-full">
                <LockIcon className="w-fit shrink-0" />
                <p className="lg:hidden truncate w-full">
                  {t("notActivatedShort")}
                </p>
                <p className="hidden lg:inline truncate w-full">
                  {t("notActivatedLong")}
                </p>
              </div>

              <button
                className="border shrink-0 border-background text-background text-btn py-1.5 px-3 rounded-lg hover:cursor-pointer hover:bg-border/20"
                onClick={() => setIsGetAccessModalOpen(true)}
              >
                {t("getAccess")}
              </button>
            </div>
          )}

          {isGetAccessModalOpen && (
            <GetAccessModal
              onClose={() => setIsGetAccessModalOpen(false)}
            />
          )}

          <div className="flex flex-row flex-1 min-h-0 min-w-0">
            <div className="hidden lg:flex">
              <SidebarDesktop>
                <SidebarConversations
                  view={sidebarView}
                  onViewChange={setSidebarView}
                  chats={chats}
                  tasks={tasks}
                  loading={loading}
                  renameConversation={renameConversation}
                  deleteConversation={deleteConversation}
                />
              </SidebarDesktop>
            </div>

            <div className="w-full h-full flex flex-col bg-background min-w-0">
              <ChatHeader
                chats={chats}
                tasks={tasks}
                loading={loading}
                renameConversation={renameConversation}
                deleteConversation={deleteConversation}
                sidebarView={sidebarView}
                onSidebarViewChange={setSidebarView}
              />

              <div className="flex flex-1 min-h-0 flex-col">
                <ChatClient
                  conversationId={route?.id}
                  conversationKind={route?.kind ?? "chat"}
                  isTaskRunning={currentConversation?.isTaskRunning}
                  nextRunAt={currentConversation?.nextRunAt}
                  onTaskStreamEnded={() => {
                    void refreshTasks();
                  }}
                  createChat={createChat}
                  creatingChat={creating}
                  openContactModal={() => setIsGetAccessModalOpen(true)}
                />
              </div>
            </div>

            {children}
          </div>
        </div>
      )}
    </>
  );
}
