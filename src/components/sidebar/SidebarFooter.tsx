"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import { apiFetch } from "@/src/lib/api";
import { useConnection } from "@/src/components/auth/ConnectionContext";

type User = {
  id: number;
  name: string;
  avatar: string | null;
};

function getLoginPath(locale: string) {
  return locale === "en" ? "/login" : `/${locale}/login`;
}

export function SidebarFooter() {
  const { expanded } = useSidebar();
  const t = useTranslations("sidebarFooter");
  const locale = useLocale();
  const router = useRouter();
  const { setAuth, setAccess, username } = useConnection();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const user: User = {
    id: 1,
    name: username ?? t("guest"),
    avatar: null,
  };

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Still clear local session and redirect even if network fails
    } finally {
      setMenuOpen(false);
      setAccess("disabled");
      setAuth("needs_auth");
      setLoggingOut(false);
      router.replace(getLoginPath(locale));
    }
  }

  return (
    <div
      ref={rootRef}
      className={`
        relative shrink-0 z-20
        flex flex-row justify-between items-center
        transition-[padding,border-color] duration-300 ease-out motion-reduce:transition-none
        bg-background
        ${expanded ? "border-t border-border px-3 py-3 sm:px-6" : "px-3 py-3 border-t border-transparent"}
        w-full
      `}
    >
      {menuOpen && (
        <div
          className="
            absolute bottom-full left-3 right-3 mb-2
            rounded-xl border border-border bg-elevated shadow-xl
            p-1 z-30
          "
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            className="
              w-full flex items-center gap-3 rounded-lg px-3 py-2.5
              text-left text-body-sm text-error
              hover:bg-error/10 hover:cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-4 shrink-0"
              aria-hidden
            >
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="16 17 21 12 16 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="21"
                y1="12"
                x2="9"
                y2="12"
                strokeLinecap="round"
              />
            </svg>
            <span>{loggingOut ? t("loggingOut") : t("logout")}</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={`
          flex flex-row gap-3 items-center min-w-0 flex-1 rounded-lg
          hover:bg-elevated hover:cursor-pointer
          ${expanded ? "px-2 py-1.5" : "justify-center p-1.5"}
          ${menuOpen ? "bg-elevated" : ""}
        `}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <div className="size-8 rounded-full overflow-hidden bg-surface border border-border shrink-0 flex items-center justify-center">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-caption text-foreground-muted font-medium">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div
          className={`
            overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out motion-reduce:transition-none
            ${expanded ? "max-w-36 opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-2"}
          `}
        >
          <p className="font-sans text-body-sm text-foreground-secondary whitespace-nowrap truncate">
            {user.name}
          </p>
        </div>
      </button>
    </div>
  );
}
