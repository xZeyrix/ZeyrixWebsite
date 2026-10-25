"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useInvite } from "@/src/hooks/useInvite";
import { AccessInvite } from "@/src/types/chat";
import { useConnection } from "@/src/components/auth/ConnectionContext";
import { useTranslations, useLocale, _Translator } from "next-intl";
import ErrorIcon from "@/src/icons/warning.svg";

// ---------- helpers ----------

function formatDateTime(locale: string, iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale === "kk" ? "ru" : locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isPast(iso?: string) {
  if (!iso) return false;
  return new Date(iso).getTime() <= Date.now();
}

function formatCountdown(t: _Translator<Record<string, any>>, iso?: string) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}${t("d")} ${hours}${t("h")}`;
  if (hours > 0) return `${hours}${t("h")} ${minutes}${t("m")}`;
  return `${Math.max(minutes, 1)}${t("m")}`;
}

// ---------- icons ----------

function IconEnvelope({ pulsing }: { pulsing?: boolean }) {
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2410] ${
        pulsing ? "animate-invite-pulse" : ""
      }`}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    </div>
  );
}

function IconCheck() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2a2410]">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="invite-check-draw text-primary"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
  );
}

function IconBlocked() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#221c1c]">
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground-muted"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    </div>
  );
}

// ---------- main component ----------

type ViewState = "loading" | "notFound" | "pending" | "expired" | "unavailable" | "activated";

export default function InviteActivation() {
  const router = useRouter();
  const pathname = usePathname();
  const [queryToken, setQueryToken] = useState<string | null>(null);
  const pathSegments = pathname.split("/").filter(Boolean);
  const inviteSegmentIndex = pathSegments.indexOf("invite");
  const token = queryToken ??
    (inviteSegmentIndex >= 0 ? pathSegments[inviteSegmentIndex + 1] : undefined);

  const { getInvite, activateInvite } = useInvite(token);

  const [invite, setInvite] = useState<AccessInvite | null>(null);
  const [activating, setActivating] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  const { state, auth, retryAuth } = useConnection();
  const t = useTranslations("invite");
  const connectionErrorT = useTranslations("connectionError");
  const locale = useLocale();

  const mounted = useRef(true);
  useEffect(() => {
    setQueryToken(new URLSearchParams(window.location.search).get("token"));
  }, [pathname]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (state !== "ready") {
        return;
    }

    getInvite().then((data) => {
    if (mounted.current) setInvite(data);
    });
  }, [getInvite, state]);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (auth !== "needs_auth") return;
    const next = encodeURIComponent(pathname);
    router.replace(`/login?next=${next}`);
  }, [auth, locale, pathname, router]);

  const handleActivate = useCallback(async () => {
    setError(null);
    setActivating(true);
    try {
      await activateInvite();
      setJustActivated(true);
    } catch (e) {
      if (!mounted.current) return;
      setError(t("failedToActivate"));
    } finally {
      if (mounted.current) setActivating(false);
    }
  }, [activateInvite, getInvite]);

  const goToAgent = useCallback(() => {
    router.push("/chat");
  }, [router]);

  const goToMain = useCallback(() => {
    router.push("/");
  }, [router])

  // ---- resolve which screen to show ----
  let view: ViewState = "loading";
  if (invite) {
    if (invite.status === "notFound") view = "notFound";
    else if (invite.status === "activated") view = "activated";
    else if (invite.status === "expired") view = "expired";
    else if (invite.status === "exhausted" || invite.status === "revoked")
      view = "unavailable";
    else if (invite.status === "pending") {
      view = isPast(invite.activationExpiresAt) ? "expired" : "pending";
    }
  }

  if (auth === "error") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-error/30 bg-error/10 text-2xl text-error">
            <ErrorIcon className="size-5" />
          </div>
          <h1 className="text-h2 text-foreground">
            {connectionErrorT("title")}
          </h1>
          <p className="text-body-sm text-foreground-muted">
            {connectionErrorT("text")}
          </p>
          <button
            type="button"
            onClick={retryAuth}
            className="rounded-xl bg-primary px-5 py-3 text-btn text-background transition hover:bg-primary-hover hover:cursor-pointer"
          >
            {connectionErrorT("button")}
          </button>
        </div>
      </div>
    );
  }

  if (auth !== "authenticated") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-105 rounded-2xl border border-border bg-surface p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="mb-6 text-center text-sm font-semibold tracking-wide text-primary">
          Zeyrix
        </div>

        {view === "loading" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-16 w-16 animate-pulse rounded-full bg-border" />
            <div className="h-4 w-40 animate-pulse rounded bg-border" />
          </div>
        )}

        {view === "notFound" && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <IconBlocked />
            <h1 className="text-lg font-semibold text-foreground">
              {t("notFoundTitle")}
            </h1>
            <p className="text-sm text-foreground-muted">
              {t("notFoundDescription")}
            </p>

            <p 
                className="text-caption text-foreground-muted underline hover:text-foreground-secondary hover:cursor-pointer"
                onClick={goToMain}
            >
                {t("goToMain")}
            </p>
          </div>
        )}

        {view === "expired" && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <IconBlocked />
            <h1 className="text-lg font-semibold text-foreground">
              {t("expiredTitle")}
            </h1>
            <p className="text-sm text-foreground-muted">
              {t("expiredDescription")}
            </p>
            {invite?.activationExpiresAt && (
              <p className="text-xs text-foreground-muted">
                {t("expired")}: {formatDateTime(locale, invite.activationExpiresAt)}
              </p>
            )}

            <p 
                className="text-caption text-foreground-muted underline hover:text-foreground-secondary hover:cursor-pointer"
                onClick={goToMain}
            >
                {t("goToMain")}
            </p>
          </div>
        )}

        {view === "unavailable" && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <IconBlocked />
            <h1 className="text-lg font-semibold text-foreground">
              {t("inviteUnavailable")}
            </h1>
            <p className="text-sm text-foreground-muted">
              {invite?.status === "revoked"
                ? t("inviteWasRevoked")
                : t("inviteCannotBeUsed")}
            </p>

            <p 
                className="text-caption text-foreground-muted underline hover:text-foreground-secondary hover:cursor-pointer"
                onClick={goToMain}
            >
                {t("goToMain")}
            </p>
          </div>
        )}

        {view === "pending" && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center">
              {justActivated ? (
                <IconCheck />
              ) : (
                <IconEnvelope pulsing={!activating} />
              )}
            </div>

            <h1 className="text-lg font-semibold text-foreground transition-opacity">
              {justActivated ? t("activated") : t("hasInvite")}
            </h1>

            {!justActivated && (
              <p className="text-sm text-foreground-muted">
                {t("activateAccess")}
              </p>
            )}

            {justActivated && invite && (
              <p className="text-sm text-foreground-muted">
                {invite.accessExpiresAt
                  ? `${t("accessUntil")} ${formatDateTime(locale, invite.accessExpiresAt)}`
                  : t("accessGranted")}
              </p>
            )}

            {error && <p className="text-sm text-[#c97a7a]">{error}</p>}

            {!justActivated ? (
              <button
                onClick={handleActivate}
                disabled={activating}
                className="mt-2 w-full rounded-[10px] bg-primary py-3 text-sm font-semibold text-background transition hover:bg-primary-hover hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activating ? t("activating") : t("activate")}
              </button>
            ) : (
              <button
                onClick={goToAgent}
                className="mt-2 w-full rounded-[10px] bg-primary py-3 text-sm font-semibold text-background transition hover:bg-primary-hover hover:cursor-pointer"
              >
                {t("goToAgent")}
              </button>
            )}

            {!justActivated && invite?.activationExpiresAt && (
              <p className="text-xs text-foreground-muted">
                {formatCountdown(t, invite.activationExpiresAt)
                  ? `${t("lasts")}: ${formatCountdown(t, invite.activationExpiresAt)}`
                  : null}
              </p>
            )}
          </div>
        )}

        {view === "activated" && invite && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <IconCheck />
            <h1 className="text-lg font-semibold text-foreground">
              {t("alreadyActivated")}
            </h1>
            <p className="text-sm text-foreground-muted">
              {t("activationDate")}: {formatDateTime(locale, invite.activatedAt)}
            </p>
            {invite.accessExpiresAt && (
              <p className="text-xs text-foreground-muted">
                {t("accessUntil")}{" "}
                {formatDateTime(locale, invite.accessExpiresAt)}
              </p>
            )}
            <button
              onClick={goToAgent}
              className="mt-2 w-full rounded-[10px] bg-primary py-3 text-sm font-semibold text-background transition hover:bg-primary-hover hover:cursor-pointer"
            >
              {t("goToAgent")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}