"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ConnectionState = "connecting" | "ready" | "unreachable";
type Access = "loading" | "granted" | "disabled";
export type AuthState = "checking" | "needs_auth" | "authenticated" | "error";

interface ConnectionContextValue {
  state: ConnectionState;
  access: Access;
  auth: AuthState;
  setState: (s: ConnectionState) => void;
  setAccess: (s: Access) => void;
  setAuth: (s: AuthState) => void;
  retryAuth: () => void;
  authRetryKey: number;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>("connecting");
  const [access, setAccess] = useState<Access>("loading");
  const [auth, setAuth] = useState<AuthState>("checking");
  const [authRetryKey, setAuthRetryKey] = useState(0);

  function retryAuth() {
    setAuth("checking");
    setAuthRetryKey((key) => key + 1);
  }

  return (
    <ConnectionContext.Provider
      value={{
        state,
        access,
        auth,
        setState,
        setAccess,
        setAuth,
        retryAuth,
        authRetryKey,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx)
    throw new Error("useConnection must be used within ConnectionProvider");
  return ctx;
}
