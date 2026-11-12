"use client";

import { useChat } from "@/src/hooks/useChat";
import { ChatArea } from "@/src/components/chat/ChatArea";
import { ComposeArea } from "@/src/components/chat/ComposeArea";
import { TaskActionPanel } from "@/src/components/chat/TaskActionPanel";
import { useState, Dispatch, SetStateAction } from "react";
import {
  AccessInfoModalStatus,
  AccessInfoModal,
} from "@/src/components/modals/accessInfo";
import { useConnection } from "@/src/components/auth/ConnectionContext";
import { ConversationKind } from "@/src/types/chat";

export default function ChatClient({
  conversationId,
  conversationKind = "chat",
  isTaskRunning,
  createChat,
  openContactModal,
  creatingChat,
}: {
  conversationId?: string;
  conversationKind?: ConversationKind;
  isTaskRunning?: boolean;
  createChat: (
    userPrompt: string,
    setComposeError: Dispatch<
      SetStateAction<"forbidden" | "chat-not-created" | null>
    >,
    setModalState: Dispatch<SetStateAction<AccessInfoModalStatus | null>>,
  ) => Promise<string>;
  creatingChat: boolean;
  openContactModal: () => void;
}) {
  const { setAccess } = useConnection();

  const [closeToBottom, setCloseToBottom] = useState(true);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [AccessInfoModalState, setAccessInfoModalState] =
    useState<AccessInfoModalStatus | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    applyToolUse,
    retrySendMessage,
    stopGeneration,
    setShouldMessagesLoad,
  } = useChat(setAccessInfoModalState, conversationId, conversationKind);

  const isToolRequestPending = messages.some(
    (message) =>
      message.role === "assistant" &&
      message.status === "approval_required" &&
      message.steps?.some(
        (step) =>
          step.approvalDetails?.approvalExpiresAt &&
          new Date(step.approvalDetails.approvalExpiresAt) > new Date(),
      ),
  );

  const handleCancelTask = async () => {
    setCancelling(true);
    try {
      stopGeneration();
    } finally {
      setCancelling(false);
    }
  };

  const isRootChat = !conversationId;
  const isTask = conversationKind === "task";

  if (isRootChat) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center mt-[10dvh] py-8 md:mt-[20dvh]">
        {AccessInfoModalState && (
          <AccessInfoModal
            status={AccessInfoModalState}
            onClose={() => {
              setAccess("disabled");
              setAccessInfoModalState(null);
            }}
          />
        )}

        <div className="w-full max-w-190 flex flex-col items-center gap-[clamp(2rem,5vw,3rem)]">
          <div className="min-h-[clamp(3rem,8vw,4.5rem)] w-full flex items-center justify-center">
            <ChatArea
              chatId={conversationId}
              messages={messages}
              loading={loading}
              error={error}
              compactEmptyState
              applyToolUse={applyToolUse}
              retrySendMessage={retrySendMessage}
              closeToBottom={closeToBottom}
              setCloseToBottom={setCloseToBottom}
              shouldScroll={shouldScroll}
              setShouldScroll={setShouldScroll}
              reloadMessages={() => setShouldMessagesLoad(true)}
            />
          </div>

          <ComposeArea
            chatId={conversationId}
            sendMessage={sendMessage}
            sending={sending}
            createChat={createChat}
            creatingChat={creatingChat}
            isNewChat
            isToolRequestPending={isToolRequestPending}
            failedToLoad={false}
            stopGeneration={stopGeneration}
            closeToBottom={closeToBottom}
            setShouldScroll={setShouldScroll}
            openContactModal={openContactModal}
            setModalState={setAccessInfoModalState}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {AccessInfoModalState && (
        <AccessInfoModal
          status={AccessInfoModalState}
          onClose={() => {
            setAccess("disabled");
            setAccessInfoModalState(null);
          }}
        />
      )}

      <div className="flex-1 min-h-0">
        <ChatArea
          key={`${conversationKind}-${conversationId ?? "new"}`}
          chatId={conversationId}
          messages={messages}
          loading={loading}
          error={error}
          applyToolUse={applyToolUse}
          retrySendMessage={retrySendMessage}
          closeToBottom={closeToBottom}
          setCloseToBottom={setCloseToBottom}
          shouldScroll={shouldScroll}
          setShouldScroll={setShouldScroll}
          reloadMessages={() => setShouldMessagesLoad(true)}
        />
      </div>

      {isTask ? (
        <TaskActionPanel
          isTaskRunning={Boolean(isTaskRunning)}
          onCancelTask={handleCancelTask}
          cancelling={cancelling}
        />
      ) : (
        <ComposeArea
          chatId={conversationId}
          sendMessage={sendMessage}
          sending={sending}
          createChat={createChat}
          creatingChat={creatingChat}
          isNewChat={false}
          isToolRequestPending={isToolRequestPending}
          failedToLoad={Boolean(messages.length === 0 && error)}
          stopGeneration={stopGeneration}
          closeToBottom={closeToBottom}
          setShouldScroll={setShouldScroll}
          openContactModal={openContactModal}
          setModalState={setAccessInfoModalState}
        />
      )}
    </div>
  );
}
