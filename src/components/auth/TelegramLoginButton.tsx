"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (
          options: { bot_id: string; request_access?: boolean },
          callback: (data: TelegramUser | false) => void,
        ) => void;
      };
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

const BOT_ID = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID!;

export default function TelegramLoginButton({
  onSuccess,
  onError,
}: TelegramLoginButtonProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAuth(user: TelegramUser | false) {
    if (!user) {
      const msg = "Авторизация через Telegram отменена";
      setError(msg);
      onError?.(msg);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const msg = "Не удалось войти через Telegram";
        setError(msg);
        onError?.(msg);
      }
    } catch {
      const msg = "Ошибка сети";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  function startLogin() {
    if (!window.Telegram?.Login) {
      setError("Telegram SDK ещё не загрузился");
      return;
    }

    setLoading(true);
    setError(null);

    window.Telegram.Login.auth(
      { bot_id: BOT_ID, request_access: true },
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
        onClick={startLogin}
        disabled={!scriptLoaded || loading}
        className="flex items-center justify-center gap-2 rounded-lg bg-[#2AABEE] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#229ED9] disabled:opacity-50"
      >
        {loading ? "Вход..." : "Войти через Telegram"}
      </button>

      {error && <p className="text-caption text-red-400 mt-2">{error}</p>}
    </>
  );
}