"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import SplashScreen from "./SplashScreen";
import TurnstileWidget from "./TurnstileWidget";
import TelegramLoginButton from "./TelegramLoginButton";
import { useConnection } from "./ConnectionContext";

type AuthState =
  | "checking"
  | "needs_auth"
  | "anonymous"
  | "authenticated"
  | "error";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;
const SPLASH_DELAY_MS = 150;
const CACHE_KEY = "zeyrix_was_authenticated";

const IGNORE_AUTH = false;

export default function AuthGate({ children }: { children: ReactNode }) {
  const { setState, setAccess } = useConnection();

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [showSplash, setShowSplash] = useState(false);
  const hasStartedRef = useRef(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    if (sessionStorage.getItem(CACHE_KEY) === "true") {
      setAuthState("authenticated");
    }

    checkStatus();
  }, []);

  useEffect(() => {
    if (authState !== "checking") {
      setShowSplash(false);
      return;
    }
    const timer = setTimeout(() => setShowSplash(true), SPLASH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [authState]);

  async function checkStatus() {
    if (IGNORE_AUTH) {
      sessionStorage.setItem(CACHE_KEY, "true");
      setAuthState("authenticated");
      return;
    }

    let res: Response;
    try {
      res = await fetch("/api/auth/status", { credentials: "include" });
    } catch {
      setState("unreachable");
      handleFailure();
      return;
    }

    if (!res.ok) {
      setState("unreachable");
      handleFailure();
      return;
    }

    setState("ready");

    let data: { authenticated: boolean; access: boolean };
    try {
      data = await res.json();
    } catch {
      handleFailure();
      return;
    }

    retryCountRef.current = 0;

    if (data.authenticated) {
      sessionStorage.setItem(CACHE_KEY, "true");
      setAuthState("authenticated");
    } else {
      sessionStorage.removeItem(CACHE_KEY);
      setAuthState("needs_auth");
    }

    if (data.access) {
      setAccess("granted");
    } else {
      setAccess("disabled");
    }
  }

  function handleFailure() {
    if (retryCountRef.current < MAX_RETRIES) {
      const attempt = retryCountRef.current;
      retryCountRef.current += 1;
      setTimeout(checkStatus, RETRY_DELAY_MS * 2 ** attempt);
      return;
    }
    if (authState !== "authenticated") {
      setAuthState("error");
    }
  }

  function handleManualRetry() {
    retryCountRef.current = 0;
    setAuthState("checking");
    checkStatus();
  }

  function handleAuthSuccess() {
    sessionStorage.setItem(CACHE_KEY, "true");
    setAuthState("authenticated");
  }

  if (authState === "checking") {
    return showSplash ? (
      <SplashScreen />
    ) : (
      <div className="fixed inset-0 bg-background" />
    );
  }

  if (authState === "error") {
    return (
      <SplashScreen>
        <p className="text-body-sm text-foreground-muted">
          Не удалось подключиться к серверу.
        </p>
        <button
          onClick={handleManualRetry}
          className="text-btn text-primary underline hover:cursor-pointer"
        >
          Повторить
        </button>
      </SplashScreen>
    );
  }

  if (authState === "needs_auth") {
    return (
      <SplashScreen>
        <div className="flex flex-col items-center gap-4">
          <TelegramLoginButton onSuccess={handleAuthSuccess} />

          <button
            onClick={() => setAuthState("anonymous")}
            className="text-body-sm text-foreground-muted underline hover:text-foreground hover:cursor-pointer"
          >
            Продолжить анонимно
          </button>
        </div>
      </SplashScreen>
    );
  }

  if (authState === "anonymous") {
    return (
      <SplashScreen>
        <TurnstileWidget onSuccess={handleAuthSuccess} />
        <button
          onClick={() => setAuthState("needs_auth")}
          className="mt-3 text-caption text-foreground-muted underline"
        >
          Назад
        </button>
      </SplashScreen>
    );
  }

  return <>{children}</>;
}