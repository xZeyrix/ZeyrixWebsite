"use client";

import PlusIcon from "@/src/icons/plus.svg";
import MicroIcon from "@/src/icons/microphone.svg";
import SendIcon from "@/src/icons/arrow.svg";
import CheckIcon from "@/src/icons/check.svg";
import CloseIcon from "@/src/icons/close.svg";
import ErrorIcon from "@/src/icons/warning.svg";
import StopIcon from "@/src/icons/stop.svg";
import ArrowIcon from "@/src/icons/arrow.svg";

import { useRef, useState, SetStateAction, Dispatch } from "react";
import { useConnection } from "../auth/ConnectionContext";
import { usePathname } from "next/navigation";
import { useFileUpload } from "@/src/hooks/useFileUpload";
import { AttachmentCard } from "./Attachment";
import { mapAttachments, Attachment } from "@/src/types/chat";
import { useVoiceRecorder } from "@/src/hooks/useVoiceRecorder";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { useChatDraft } from "@/src/hooks/useChatDraftStore";
import { AccessInfoModalStatus, AccessInfoModal } from "../modals/accessInfo";
import { notifyChatRouteChanged } from "@/src/hooks/useChatRoute";

type ComposeAreaProps = {
  chatId?: string;
  sendMessage: (
    prompt: string,
    attachments: Attachment[],
    fileIds: string[],
    newChatId?: string,
  ) => Promise<void>;
  sending: boolean;
  createChat: (
    userPrompt: string,
    setComposeError: Dispatch<SetStateAction<"forbidden" | "chat-not-created" | null>>,
    setModalState: Dispatch<SetStateAction<AccessInfoModalStatus | null>>,
  ) => Promise<string>;
  isNewChat: boolean;
  isToolRequestPending: boolean;
  failedToLoad: boolean;
  stopGeneration: () => void;
  closeToBottom: boolean;
  setShouldScroll: Dispatch<SetStateAction<boolean>>;
  openContactModal: () => void;
  setModalState: Dispatch<SetStateAction<AccessInfoModalStatus | null>>;
};

export function ComposeArea({
  chatId,
  sendMessage,
  sending,
  createChat,
  isNewChat,
  isToolRequestPending,
  failedToLoad,
  stopGeneration,
  closeToBottom,
  setShouldScroll,
  openContactModal,
  setModalState,
}: ComposeAreaProps) {
  const t = useTranslations("composeArea");

  const { state, access } = useConnection();
  const canInteract = state === "ready" && !failedToLoad && access === "granted";
  const pathname = usePathname();
  const [composeError, setComposeError] = useState<"chat-not-created" | "forbidden" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    addAttachment,
    removeAttachment,
    readyFileIds,
    isUploading,
    transcribeVoice,
    attachments,
  } = useFileUpload(setModalState, chatId);

  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    microphoneError,
    setMicrophoneError,
    waveform,
  } = useVoiceRecorder({
    onRecordingFinished: async (blob) => {
      const voiceFile = new File([blob], "voice.webm", {
        type: blob.type,
      });

      const transcribed = await transcribeVoice(voiceFile);

      setMessage((prev) => `${prev.trim()} ${transcribed}`.trim());

      requestAnimationFrame(resizeTextarea);
    },
  });

  const { setMessage, draft, setAttachments } = useChatDraft(chatId);
  const message = draft.message;

  const canSend =
    message.trim().length > 0 &&
    canInteract &&
    !sending &&
    !isUploading &&
    !isToolRequestPending;

  const textareaRef = useRef<HTMLTextAreaElement>(null);


  const handleFiles = (files: File[]) => {
      files.forEach(addAttachment);
  };
  
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    
    if (files.length > 0) {
      handleFiles(files);
    }

    e.target.value = "";
  }

  function resizeTextarea() {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(e.target.value);
    resizeTextarea();
  }

  async function handleSend() {
    if (!canSend) return;

    setMessage("");

    const attachmentsToSend = attachments.filter((att) => att.status === "done").map(mapAttachments);
    setAttachments([]);

    try {
      if (chatId) {
        await sendMessage(message, attachmentsToSend, readyFileIds);
      } else {
        const newChatId = await createChat(message, setComposeError, setModalState);
        const chatPath = pathname.slice(0, pathname.indexOf("/chat") + 5);
        window.history.replaceState(
          {},
          "",
          `${chatPath}?chat=${encodeURIComponent(newChatId)}`,
        );
        notifyChatRouteChanged();
        await sendMessage(message, attachmentsToSend, readyFileIds, newChatId);
      }
    } catch {

    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const textareaPlaceholder = () => {
    if (state !== "ready") {
      return t("connectingPlaceholder");
    } else if (failedToLoad) {
      return t("chatUnavailablePlaceholder");
    } else if (isTranscribing) {
      return t("transcribingPlaceholder");
    } else if (isRecording) {
      return t("recordingPlaceholder");
    } else if (access === "disabled") {
      return t("accessDisabled");
    } else {
      return t("standardPlaceholder");
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!canInteract || sending || isRecording) {
        return;
    }

    const files = Array.from(e.clipboardData.files);

    if (files.length > 0) {
        handleFiles(files);
    }
  };

  return (
    <div className="bg-background px-6 pb-3 w-full h-fit flex flex-col items-center relative">
      {!closeToBottom && (
        <div className="absolute -top-15 w-full flex justify-center pointer-events-none">
          <button 
            className="p-3 bg-primary-surface border border-primary-outline hover:border-primary-hover rounded-full hover:cursor-pointer pointer-events-auto transition-all"
            onClick={() => setShouldScroll(true)}
          >
            <ArrowIcon className="size-3 text-primary rotate-180" />
          </button>
        </div>
      )}

      <div
        className={`
                    bg-background border rounded-2xl
                    px-4 py-3 flex flex-col gap-2
                    max-w-190 w-full relative
                    ${microphoneError || composeError ? "border-error" : "border-border"}
                `}
        onClick={() => {
          setMicrophoneError(null);
          setComposeError(null);
        }}
      >
        {access === "disabled" && (
          <div
            className="absolute inset-0 w-full h-full hover:cursor-pointer z-1"
            onClick={openContactModal}
          />
        )}

        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1 pt-2 scrollbar-thin">
                {attachments.map((a) => (
                  <AttachmentCard
                    key={a.localId}
                    attachment={a}
                    onRemove={removeAttachment}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          autoFocus={isNewChat}
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          disabled={!canInteract}
          placeholder={textareaPlaceholder()}
          readOnly={isRecording}
          rows={isNewChat ? 2 : 1}
          className={`
                        w-full h-fit resize-none bg-transparent outline-none font-sans text-body text-foreground placeholder:text-foreground-muted max-h-50
                        ${isTranscribing && "animate-pulse"}
                    `}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="w-full h-fit flex justify-between gap-5">
          <button
            className={`
              size-8 flex items-center justify-center rounded-lg
              ${canInteract && access === "granted" && "hover:bg-elevated"}
              ${isRecording && "hidden"}
              ${canInteract && !isRecording && access === "granted" && "cursor-pointer"}
            `}
            onClick={() => fileInputRef.current?.click()}
            disabled={!canInteract || sending || isRecording}
          >
            <PlusIcon className={`${canInteract ? "text-foreground" : "text-foreground-muted/90"} size-4`} />
          </button>

          <div
            className={`
              flex flex-row items-center justify-end gap-1 h-full flex-1 min-w-0 overflow-hidden
              ${isTranscribing && "opacity-0"}
            `}
          >
            {waveform.map((value, index) => (
              <div
                key={index}
                className="w-1 shrink-0 bg-primary rounded-full"
                style={{
                  height: `${Math.max(value * 200, 3)}px`,
                  minHeight: "3px",
                  maxHeight: "30px",
                }}
              />
            ))}
          </div>

          <div className="flex flex-row items-center gap-3">
            {isRecording ? (
              <>
                <button
                  className={`
                    size-8 rounded-lg flex items-center justify-center
                    hover:cursor-pointer bg-elevated hover:bg-border
                  `}
                  disabled={!canInteract}
                  onClick={() => {
                    isRecording && stopRecording(true);
                  }}
                >
                  <CloseIcon className="text-foreground-secondary size-3.5" />
                </button>

                <button
                  className={`
                    size-8 rounded-lg flex items-center justify-center
                    bg-primary cursor-pointer hover:bg-primary-hover transition-colors
                  `}
                  onClick={() => {
                    isRecording && stopRecording(false);
                  }}
                >
                  <CheckIcon className="size-3 text-background" />
                </button>
              </>
            ) : (
              <>
                <button
                  className={`
                    size-8 rounded-lg flex items-center justify-center relative
                    ${canInteract && access === "granted" && "hover:cursor-pointer hover:bg-elevated"}
                  `}
                  disabled={!canInteract}
                  onClick={(e) => {
                    if (!isRecording) {
                      e.stopPropagation();
                      startRecording();
                    }
                  }}
                >
                  <MicroIcon className={`${canInteract ? "text-foreground-secondary" : "text-foreground-muted/90"} size-5`} />
                </button>
                
                {!sending ? (
                  <button
                    disabled={!canSend}
                    className={`
                      size-8 rounded-lg flex items-center justify-center
                      transition-all duration-200
                      ${canSend ? "bg-primary cursor-pointer hover:bg-primary-hover transition-colors" : "bg-primary/50"}
                    `}
                    onClick={handleSend}
                  >
                    <SendIcon className="size-3 text-primary-surface" />
                  </button>
                ) : (
                  <button
                    disabled={!sending}
                    className={`
                      size-8 rounded-lg flex items-center justify-center
                      transition-all duration-200
                      ${sending ? "bg-primary cursor-pointer hover:bg-primary-hover transition-colors" : "bg-primary/50"}
                    `}
                    onClick={stopGeneration}
                  >
                    <StopIcon className="size-4 text-primary-surface" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {(microphoneError || composeError) && (
          <div className="text-error flex flex-row items-center gap-2 text-body-sm">
            <ErrorIcon className="shrink-0" />
            
            {microphoneError === "denied" ? (
              <p>{t("microphoneDenied")}</p>
            ) : microphoneError === "not-found" ? (
              <p>{t("microphoneNotFound")}</p>
            ) : microphoneError === "unavailable" ? (
              <p>{t("microphoneUnavailable")}</p>
            ) : microphoneError === "server-error" ? (
              <p>{t("serverTranscribeError")}</p>
            ) : microphoneError === "forbidden" || composeError === "forbidden" ? (
              <p>{t("accessForbiddenError")}</p>
            ) : composeError === "chat-not-created" && (
              <p>{t("chatNotCreatedError")}</p>
            )}
            
          </div>
        )}
      </div>
      <div
        className={`
                text-foreground-muted font-sans text-caption max-w-190 w-full text-center
                ${isNewChat ? "hidden" : ""}
            `}
      >
        <p className="sm:hidden">{t("warningCaptionCompact")}</p>
        <p className="hidden sm:inline">{t("warningCaption")}</p>
      </div>
    </div>
  );
}
