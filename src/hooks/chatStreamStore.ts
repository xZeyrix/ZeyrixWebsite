"use client";

import { useSyncExternalStore } from "react";
import type { Message } from "../types/chat";

type Listener = () => void;

type StreamSession = {
  messages: Message[];
  controller: AbortController;
};

const sessions = new Map<string, StreamSession>();
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeChatStreams(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isChatStreaming(chatId?: string | null): boolean {
  if (!chatId) return false;
  return sessions.has(chatId);
}

export function getStreamingChatIds(): string[] {
  return Array.from(sessions.keys());
}

let cachedStreamingIds: string[] = [];
let cachedStreamingSet: ReadonlySet<string> = new Set();

export function getStreamingChatIdsSnapshot(): ReadonlySet<string> {
  const ids = getStreamingChatIds();
  const same =
    ids.length === cachedStreamingIds.length &&
    ids.every((id, i) => id === cachedStreamingIds[i]);
  if (same) return cachedStreamingSet;

  cachedStreamingIds = ids;
  cachedStreamingSet = new Set(ids);
  return cachedStreamingSet;
}

export function getStreamMessages(chatId: string): Message[] | null {
  return sessions.get(chatId)?.messages ?? null;
}

export function getStreamController(
  chatId: string,
): AbortController | undefined {
  return sessions.get(chatId)?.controller;
}

export function startChatStream(
  chatId: string,
  messages: Message[],
  controller: AbortController,
) {
  sessions.set(chatId, { messages, controller });
  emit();
}

export function updateChatStreamMessages(
  chatId: string,
  updater: (prev: Message[]) => Message[],
) {
  const session = sessions.get(chatId);
  if (!session) return;

  session.messages = updater(session.messages);
  emit();
}

export function setChatStreamMessages(chatId: string, messages: Message[]) {
  const session = sessions.get(chatId);
  if (!session) return;

  session.messages = messages;
  emit();
}

export function endChatStream(chatId: string) {
  const session = sessions.get(chatId);
  if (!session) return;

  sessions.delete(chatId);
  emit();
}

export function abortChatStream(chatId: string) {
  const session = sessions.get(chatId);
  if (!session) return;
  session.controller.abort();
}

const EMPTY_STREAMING_SET: ReadonlySet<string> = new Set();

export function useStreamingChatIds(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeChatStreams,
    getStreamingChatIdsSnapshot,
    () => EMPTY_STREAMING_SET,
  );
}
