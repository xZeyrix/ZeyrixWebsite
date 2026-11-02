"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import TelegramIcon from "@/src/icons/telegram.svg";
import { apiFetch } from "@/src/lib/api";
import { useTranslations } from "next-intl";

declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (
          options: { bot_id: string; request_access?: boolean },
          callback: (data: TelegramUser | false) => void,
        ) => void;
      };
      WebApp?: unknown;
    };
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  onSuccess: () => void;
  onError?: (message: string) => void;
}

const BOT_ID = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;

function isTelegramInAppBrowser() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return Boolean(window.Telegram?.WebApp) || /Telegram/i.test(ua);
}

function readTelegramAuthFromHash(): TelegramUser | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash?.replace(/^#/, "");
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const raw = params.get("tgAuthResult");
  if (!raw) return null;

  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    return JSON.parse(json) as TelegramUser;
  } catch {
    return null;
  }
}

function clearTelegramAuthHash() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}`);
}

export default function TelegramLoginButton({
  onSuccess,
  onError,
}: TelegramLoginButtonProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("login");

  async function handleAuth(user: TelegramUser | false) {
    if (!user) {
      const msg = t("authCancelled", { name: "Telegram" });
      setError(msg);
      onError?.(msg);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch("/api/auth/telegram", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const msg = t("authFailed", { name: "Telegram" });
        setError(msg);
        onError?.(msg);
      }
    } catch {
      const msg = t("networkError");
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const user = readTelegramAuthFromHash();
    if (!user) return;

    clearTelegramAuthHash();
    setLoading(true);
    setError(null);
    void handleAuth(user);
  }, []);

  function startLoginViaRedirect(botId: string) {
    const origin = window.location.origin;
    const returnTo = window.location.href.split("#")[0];

    const url = new URL("https://oauth.telegram.org/auth");
    url.searchParams.set("bot_id", botId);
    url.searchParams.set("origin", origin);
    url.searchParams.set("request_access", "write");
    url.searchParams.set("return_to", returnTo);

    window.location.assign(url.toString());
  }

  function startLogin(botId: string) {
    setLoading(true);
    setError(null);

    if (isTelegramInAppBrowser()) {
      startLoginViaRedirect(botId);
      return;
    }

    if (!window.Telegram?.Login) {
      setError(t("authNotLoaded", { name: "Telegram" }));
      setLoading(false);
      return;
    }

    window.Telegram.Login.auth(
      { bot_id: botId, request_access: true },
      handleAuth,
    );
  }

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-widget.js?22"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      <button
        onClick={() => BOT_ID && startLogin(BOT_ID)}
        disabled={
          loading ||
          !BOT_ID ||
          (!isTelegramInAppBrowser() && !scriptLoaded)
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2AABEE] px-5 py-3 text-sm font-medium text-foreground transition hover:bg-[#229ED9] disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer"
      >
        <TelegramIcon className="size-5" />
        {loading
          ? t("authInProgress")
          : t("authViaService", { name: "Telegram" })}
      </button>

      {error && <p className="text-caption text-error mt-2">{error}</p>}
    </>
  );
}