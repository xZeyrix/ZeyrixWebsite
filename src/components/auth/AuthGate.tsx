"use client";

import { useEffect, type ReactNode } from "react";
import { useConnection } from "./ConnectionContext";
import { apiFetch } from "@/src/lib/api";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { setState, setAccess, setUsername, setAuth, authRetryKey } = useConnection();

  useEffect(() => {
    let active = true;

    async function checkStatus() {
      try {
        const response = await apiFetch("/api/auth/status", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Auth status returned ${response.status}`);
        }

        const data: { authenticated: boolean; access: boolean; username: string | null } =
          await response.json();

        if (!active) return;

        setState("ready");
        setAuth(data.authenticated ? "authenticated" : "needs_auth");
        setAccess(data.access ? "granted" : "disabled");
        setUsername(data.username);
      } catch {
        if (!active) return;
        setState("unreachable");
        setAuth("error");
      }
    }

    checkStatus();
    return () => {
      active = false;
    };
  }, [authRetryKey, setAccess, setAuth, setState]);

  return <>{children}</>;
}
