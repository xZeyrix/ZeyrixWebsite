"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { apiFetch } from "@/src/lib/api";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;
const MAX_ATTEMPTS = 3;

interface TurnstileWidgetProps {
  onSuccess: () => void;
}

export default function TurnstileWidget({ onSuccess }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const attemptsRef = useRef(0);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (
      !scriptLoaded ||
      !containerRef.current ||
      widgetIdRef.current ||
      blocked
    )
      return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme: "dark",
      callback: async (token) => {
        await handleToken(token);
      },
      "expired-callback": () => {
        if (widgetIdRef.current) window.turnstile.reset(widgetIdRef.current);
      },
      "error-callback": () => {
        registerFailure("Ошибка проверки.");
      },
    });

    return () => {
      if (widgetIdRef.current) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [scriptLoaded, blocked]);

  function registerFailure(message: string) {
    attemptsRef.current += 1;

    if (attemptsRef.current >= MAX_ATTEMPTS) {
      setErrorMsg(
        "Не удалось создать сессию. Попробуйте обновить страницу позже.",
      );
      setBlocked(true);
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      return;
    }

    setErrorMsg(
      `${message} Осталось попыток: ${MAX_ATTEMPTS - attemptsRef.current}.`,
    );
    if (widgetIdRef.current) window.turnstile.reset(widgetIdRef.current);
  }

  async function handleToken(token: string) {
    let res: Response;
    try {
      res = await apiFetch("/api/auth/create_account", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch {
      registerFailure("Ошибка сети.");
      return;
    }

    if (res.status === 200) {
      onSuccess();
    } else {
      registerFailure("Не удалось создать сессию.");
    }
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        onLoad={() => setScriptLoaded(true)}
      />
      {!blocked && <div ref={containerRef} />}
      {errorMsg && <p className="text-caption text-red-400 mt-2">{errorMsg}</p>}
    </>
  );
}
