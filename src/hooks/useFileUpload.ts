"use client";

import { useState, useCallback, Dispatch, SetStateAction } from "react";
import type { PendingAttachment, PresignResponse } from "@/src/types/chat";
import { cacheFile } from "../lib/FileCache";
import { useChatDraft } from "./useChatDraftStore";
import { AccessInfoModalStatus } from "../components/modals/accessInfo";
import { apiFetch } from "../lib/api";

export function useFileUpload(setModalState: Dispatch<SetStateAction<AccessInfoModalStatus | null>>, chatId?: string) {
  const { setAttachments, draft } = useChatDraft(chatId);
  const attachments = draft.attachments

  const updateAttachment = useCallback(
    (localId: string, patch: Partial<PendingAttachment>) => {
      setAttachments((prev) =>
        prev.map((a) => (a.localId === localId ? { ...a, ...patch } : a)),
      );
    },
    [setAttachments],
  );

  const removeAttachment = useCallback((localId: string) => {
    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  }, [setAttachments]);

  function isImage(file: File): boolean {
    return file.type.startsWith("image/");
  }

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    // Step 1: presign
    const presignRes = await apiFetch("/api/files/presign", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });

    if (!presignRes.ok) {
      const error = await presignRes.json();

      if (error.code === "INVITE_REQUIRED") {
        setModalState(error.detail);
      }

      throw new Error(`${presignRes.status}`);
    }

    const { uploadUrl, fileId }: PresignResponse = await presignRes.json();

    // Step 2: PUT to storage & cache to IDB
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error(`${uploadRes.status}`);

    await cacheFile(fileId, file);

    // Step 3: confirm
    apiFetch("/api/files/confirm", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    }).catch(() => {});

    return fileId;
  }, []);

  const addAttachment = useCallback(
    async (file: File) => {
      const localId = crypto.randomUUID();
      const entry: PendingAttachment = {
        localId,
        file,
        status: "uploading",
        fileId: null,
        error: null,
      };
      setAttachments((prev) => [...prev, entry]);

      try {
        const fileId = await uploadFile(file);

        updateAttachment(localId, { status: "done", fileId });
      } catch (err) {
        updateAttachment(localId, {
          status: "error",
          error: err instanceof Error ? err.message : "500",
        });
      }
    },
    [updateAttachment, setAttachments, uploadFile],
  );

  const readyFileIds = attachments
    .filter((a) => a.status === "done" && a.fileId)
    .map((a) => a.fileId!) as string[];

  const isUploading = attachments.some((a) => a.status === "uploading");

  const transcribeVoice = useCallback(async (file: File): Promise<string> => {
    try {
      const fileId = await uploadFile(file);

      const res = await apiFetch("/api/ai/transcribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: fileId }),
      });
      if (!res.ok) {
        const error = await res.json();

        if (error.code === "INVITE_REQUIRED") {
          setModalState(error.detail);
        }

        throw new Error(`${res.status}`);
      }

      const data = await res.json();

      return data.transcribe;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to transcribe a file");
      throw error;
    }
  }, [uploadFile]);

  return {
    attachments,
    addAttachment,
    removeAttachment,
    readyFileIds,
    isUploading,
    transcribeVoice,
  };
}
