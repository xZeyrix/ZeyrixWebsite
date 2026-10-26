"use client";

import { useChat } from "@/src/hooks/useChat";
import { ChatArea } from "@/src/components/chat/ChatArea";
import { ComposeArea } from "@/src/components/chat/ComposeArea";
import { useState, Dispatch, SetStateAction } from "react";
import { AccessInfoModalStatus, AccessInfoModal } from "@/src/components/modals/accessInfo";
import { useConnection } from "@/src/components/auth/ConnectionContext";

export default function ChatClient({
  chatId,
  createChat,
  openContactModal,
  creatingChat,
}: {
  chatId?: string;
  createChat: (
    userPrompt: string,
    setComposeError: Dispatch<SetStateAction<"forbidden" | "chat-not-created" | null>>,
    setModalState: Dispatch<SetStateAction<AccessInfoModalStatus | null>>,
  ) => Promise<string>;
  creatingChat: boolean;
  openContactModal: () => void;
}) {
  const { setAccess } = useConnection();

  const [closeToBottom, setCloseToBottom] = useState(true);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [AccessInfoModalState, setAccessInfoModalState] = useState<AccessInfoModalStatus | null>(null);

  const { messages, loading, error, sending, sendMessage, applyToolUse, retrySendMessage, stopGeneration, setShouldMessagesLoad } = useChat(setAccessInfoModalState, chatId);
  const isEmptyRootChat = !chatId && messages.length === 0;

  const isToolRequestPending = messages.some(
    (message) =>
      message.role === "assistant" &&
      message.status === "approval_required" &&
      message.steps?.some(
        (step) => 
          step.approvalDetails?.approvalExpiresAt &&
          new Date(step.approvalDetails.approvalExpiresAt) > new Date()
      ),
  );

  if (isEmptyRootChat) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center mt-[10dvh] py-8 md:mt-[20dvh]">
        {AccessInfoModalState && <AccessInfoModal status={AccessInfoModalState} onClose={() => {
          setAccess("disabled");
          setAccessInfoModalState(null);
        }}/>}

        <div className="w-full max-w-190 flex flex-col items-center gap-[clamp(2rem,5vw,3rem)]">
          <ChatArea
            chatId={chatId}
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

          <ComposeArea
            chatId={chatId}
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
      {AccessInfoModalState && <AccessInfoModal status={AccessInfoModalState} onClose={() => {
        setAccess("disabled");
        setAccessInfoModalState(null);
      }}/>}

      <div className="flex-1 min-h-0">
        <ChatArea
          key={chatId ?? "new"}
          chatId={chatId}
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

      <ComposeArea
        chatId={chatId}
        sendMessage={sendMessage}
        sending={sending}
        createChat={createChat}
        creatingChat={creatingChat}
        isNewChat={chatId ? false : true}
        isToolRequestPending={isToolRequestPending}
        failedToLoad={Boolean(messages.length === 0 && error)}
        stopGeneration={stopGeneration}
        closeToBottom={closeToBottom}
        setShouldScroll={setShouldScroll}
        openContactModal={openContactModal}
        setModalState={setAccessInfoModalState}
      />
    </div>
  );
}
