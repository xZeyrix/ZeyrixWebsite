"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { wsUrl } from "../lib/api";

export type LiveCallStatus =
  | "idle"
  | "connecting"
  | "live"
  | "error"
  | "ended";

export type TranscriptRole = "user" | "agent";

export type TranscriptTurn = {
  id: string;
  role: TranscriptRole;
  text: string;
};

type UseLiveCallOptions = {
  /** Required by backend — live is only for existing chats */
  chatId?: string;
  voice?: string;
};

/**
 * Live transcription APIs send either:
 * - deltas: "При" + "вет" + "!"
 * - cumulative snapshots: "При" → "Привет" → "Привет!"
 * - occasional exact duplicates of the final phrase
 * Blind prev+incoming causes "Привет!Привет!".
 */
function mergeTranscript(prev: string, incoming: string): string {
  const next = incoming.trimStart();
  if (!next) return prev;
  if (!prev) return next.trim();
  if (next === prev) return prev;
  if (next.startsWith(prev)) return next;
  if (prev.startsWith(next)) return prev;
  if (prev.endsWith(next)) return prev;
  // Real delta chunk
  return `${prev}${next}`;
}

function appendOrUpdateTurn(
  turns: TranscriptTurn[],
  role: TranscriptRole,
  incoming: string,
): TranscriptTurn[] {
  const last = turns[turns.length - 1];
  if (last && last.role === role) {
    const merged = mergeTranscript(last.text, incoming);
    if (merged === last.text) return turns;
    return [...turns.slice(0, -1), { ...last, text: merged }];
  }
  return [
    ...turns,
    { id: crypto.randomUUID(), role, text: mergeTranscript("", incoming) },
  ];
}

function floatTo16BitPCM(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]!));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function parsePcmRate(mimeType: string | null): number {
  if (!mimeType) return 24000;
  const match = /rate=(\d+)/i.exec(mimeType);
  if (match) return Number(match[1]);
  return 24000;
}

/**
 * Live voice session against WS /ai/zeyrix/live
 *
 * Session is owned by a monotonic generation id so React Strict Mode
 * re-mount / effect re-run cannot tear down a newer connection.
 */
export function useLiveCall(options: UseLiveCallOptions = {}) {
  const [status, setStatus] = useState<LiveCallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [muted, setMutedState] = useState(false);
  const mutedRef = useRef(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const outputMimeRef = useRef<string | null>(null);
  const nextPlayTimeRef = useRef(0);
  const generationRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  const tearDownMedia = useCallback(() => {
    try {
      processorRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    processorRef.current = null;
    try {
      silentGainRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    silentGainRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;

    void captureCtxRef.current?.close().catch(() => {});
    captureCtxRef.current = null;

    void playbackCtxRef.current?.close().catch(() => {});
    playbackCtxRef.current = null;
    nextPlayTimeRef.current = 0;
  }, []);

  const closeSocket = useCallback((sendClose: boolean) => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      try {
        if (sendClose && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "close" }));
        }
        ws.close();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const cleanup = useCallback(
    (opts?: { intentional?: boolean; generation?: number }) => {
      if (
        opts?.generation != null &&
        opts.generation !== generationRef.current
      ) {
        // Stale cleanup from an older start() — do not kill the new session
        return;
      }
      if (opts?.intentional) intentionalCloseRef.current = true;
      tearDownMedia();
      closeSocket(Boolean(opts?.intentional));
    },
    [closeSocket, tearDownMedia],
  );

  const playPcmChunk = useCallback(async (data: ArrayBuffer) => {
    let ctx = playbackCtxRef.current;
    if (!ctx || ctx.state === "closed") {
      ctx = new AudioContext();
      playbackCtxRef.current = ctx;
      nextPlayTimeRef.current = 0;
    }
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* autoplay policy — will retry on next chunk after gesture */
      }
    }

    const rate = parsePcmRate(outputMimeRef.current);
    const int16 = new Int16Array(data);
    if (int16.length === 0) return;

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = (int16[i] ?? 0) / 0x8000;
    }

    const buffer = ctx.createBuffer(1, float32.length, rate);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.05, nextPlayTimeRef.current);
    try {
      source.start(startAt);
      nextPlayTimeRef.current = startAt + buffer.duration;
    } catch {
      /* ignore schedule errors after context close */
    }
  }, []);

  const start = useCallback(async () => {
    // Bump generation so any concurrent/stale cleanup is ignored
    const generation = ++generationRef.current;
    intentionalCloseRef.current = false;

    // Kill previous session media/socket without bumping generation again
    tearDownMedia();
    closeSocket(true);

    setError(null);
    setTurns([]);
    mutedRef.current = false;
    setMutedState(false);
    setStatus("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      mediaStreamRef.current = stream;

      if (!options.chatId) {
        throw new Error("Live call requires an existing chat");
      }

      const params = new URLSearchParams();
      params.set("chatId", options.chatId);
      if (options.voice) params.set("voice", options.voice);
      const url = `${wsUrl("/ai/zeyrix/live")}?${params.toString()}`;

      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          cleanupListeners();
          resolve();
        };
        const onError = () => {
          cleanupListeners();
          reject(new Error("WebSocket connection failed"));
        };
        const onClose = (ev: CloseEvent) => {
          cleanupListeners();
          reject(
            new Error(ev.reason || `WebSocket closed (${ev.code})`),
          );
        };
        function cleanupListeners() {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("error", onError);
          ws.removeEventListener("close", onClose);
        }
        ws.addEventListener("open", onOpen);
        ws.addEventListener("error", onError);
        ws.addEventListener("close", onClose);
      });

      if (generation !== generationRef.current) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        return;
      }

      // Capture mic → PCM 16-bit LE
      const captureCtx = new AudioContext({ sampleRate: 16000 });
      captureCtxRef.current = captureCtx;
      if (captureCtx.state === "suspended") {
        await captureCtx.resume();
      }

      const source = captureCtx.createMediaStreamSource(stream);
      const processor = captureCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Silent gain so the processor graph stays alive without ear feedback
      const silentGain = captureCtx.createGain();
      silentGain.gain.value = 0;
      silentGainRef.current = silentGain;

      processor.onaudioprocess = (event) => {
        if (generation !== generationRef.current) return;
        if (mutedRef.current) return; // mic muted — do not send PCM
        const wsNow = wsRef.current;
        if (!wsNow || wsNow.readyState !== WebSocket.OPEN) return;
        try {
          const input = event.inputBuffer.getChannelData(0);
          wsNow.send(floatTo16BitPCM(input));
        } catch {
          /* socket may have closed mid-callback */
        }
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(captureCtx.destination);

      ws.onmessage = (event) => {
        if (generation !== generationRef.current) return;

        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data) as {
              type?: string;
              text?: string;
              mime_type?: string;
              message?: string;
            };
            switch (msg.type) {
              case "audio_format":
                outputMimeRef.current = msg.mime_type ?? null;
                break;
              case "input_transcription":
                if (msg.text) {
                  setTurns((prev) => appendOrUpdateTurn(prev, "user", msg.text!));
                }
                break;
              case "output_transcription":
                if (msg.text) {
                  setTurns((prev) => appendOrUpdateTurn(prev, "agent", msg.text!));
                }
                break;
              case "interrupted":
                nextPlayTimeRef.current = 0;
                break;
              case "error":
                setError(msg.message || "Live session error");
                setStatus("error");
                cleanup({ generation });
                break;
            }
          } catch {
            /* ignore non-json text */
          }
          return;
        }

        if (event.data instanceof ArrayBuffer) {
          void playPcmChunk(event.data);
        } else if (event.data instanceof Blob) {
          void event.data.arrayBuffer().then((buf) => {
            if (generation === generationRef.current) void playPcmChunk(buf);
          });
        }
      };

      ws.onclose = () => {
        if (generation !== generationRef.current) return;
        tearDownMedia();
        wsRef.current = null;
        if (intentionalCloseRef.current) {
          setStatus("ended");
        } else {
          // Server closed the socket (often after one model turn — see backend FIRST_COMPLETED)
          setStatus("ended");
          setError((prev) => prev ?? "Connection closed by server");
        }
      };

      ws.onerror = () => {
        // onclose will follow
      };

      if (generation === generationRef.current) {
        setStatus("live");
      }
    } catch (err) {
      if (generation !== generationRef.current) return;
      const message =
        err instanceof Error ? err.message : "Failed to start live call";
      setError(message);
      setStatus("error");
      cleanup({ generation });
    }
  }, [
    cleanup,
    closeSocket,
    options.voice,
    playPcmChunk,
    tearDownMedia,
  ]);

  const setMuted = useCallback((value: boolean) => {
    mutedRef.current = value;
    setMutedState(value);
    // Also gate the track so OS/browser indicator matches UX
    mediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !value;
    });
  }, []);

  const stop = useCallback(() => {
    intentionalCloseRef.current = true;
    generationRef.current += 1; // invalidate in-flight start
    mutedRef.current = false;
    setMutedState(false);
    tearDownMedia();
    closeSocket(true);
    setStatus("ended");
  }, [closeSocket, tearDownMedia]);

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      generationRef.current += 1;
      tearDownMedia();
      closeSocket(true);
    };
  }, [closeSocket, tearDownMedia]);

  return {
    status,
    error,
    turns,
    muted,
    setMuted,
    start,
    stop,
  };
}
