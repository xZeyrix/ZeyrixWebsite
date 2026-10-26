import { create } from "zustand"
import { PendingAttachment } from "../types/chat";
import type { SetStateAction } from "react";

const EMPTY_DRAFT: ChatDraft = {
    message: "",
    attachments: [],
};

type ChatDraft = {
    message: string;
    attachments: PendingAttachment[];
};

type ChatDraftStore = {
    drafts: Record<string, ChatDraft>;

    setMessage: (chatId: string, message: SetStateAction<string>) => void;
    setAttachments: (chatId: string, attachments: SetStateAction<PendingAttachment[]>) => void;
    clearDraft: (chatId: string) => void;
};

const useChatDraftStore = create<ChatDraftStore>((set) => ({
    drafts: {},

    setMessage: (chatId, message) =>
        set((state) => {
            const currentMessage =
                state.drafts[chatId]?.message ?? "";

            const nextMessage =
                typeof message === "function"
                    ? message(currentMessage)
                    : message;

            return {
                drafts: {
                    ...state.drafts,
                    [chatId]: {
                        ...state.drafts[chatId],
                        message: nextMessage,
                        attachments: state.drafts[chatId]?.attachments ?? [],
                    },
                },
            };
        }),

    setAttachments: (chatId, attachments) =>
        set((state) => {
            const currentAttachments =
                state.drafts[chatId]?.attachments ?? [];

            const nextAttachments =
                typeof attachments === "function"
                    ? attachments(currentAttachments)
                    : attachments;

            return {
                drafts: {
                    ...state.drafts,
                    [chatId]: {
                        ...state.drafts[chatId],
                        message: state.drafts[chatId]?.message ?? "",
                        attachments: nextAttachments,
                    },
                },
            };
        }),

    clearDraft: (chatId) =>
        set((state) => {
        const drafts = { ...state.drafts };
        delete drafts[chatId];

        return { drafts };
        }),
}));

export function useChatDraft(chatId?: string) {
    const draftKey = chatId ?? "new";

    const draft = useChatDraftStore(
      (state) =>
        state.drafts[draftKey] ?? EMPTY_DRAFT
    );

    const setMessage = useChatDraftStore(
      (state) => state.setMessage
    );

    const setAttachments = useChatDraftStore(
      (state) => state.setAttachments
    )

    return {
      draft,
      setMessage: (message: SetStateAction<string>) => setMessage(draftKey, message),
      setAttachments: (attachments: SetStateAction<PendingAttachment[]>) => setAttachments(draftKey, attachments),
      clearDraft: () => useChatDraftStore.getState().clearDraft(draftKey),
    };
  }