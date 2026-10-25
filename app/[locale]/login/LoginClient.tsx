"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import TelegramLoginButton from "@/src/components/auth/TelegramLoginButton";
import TurnstileWidget from "@/src/components/auth/TurnstileWidget";
import { useConnection } from "@/src/components/auth/ConnectionContext";
import ErrorIcon from "@/src/icons/warning.svg";
import { useTranslations } from "next-intl";
import Link from "next/link";

function getPath(locale: string, path: string) {
  return locale === "en" ? path : `/${locale}${path}`;
}

export default function LoginClient() {
  const { auth, retryAuth } = useConnection();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [anonymous, setAnonymous] = useState(false);
  const t = useTranslations("login");
  const connectionErrorT = useTranslations("connectionError");

  useEffect(() => {
    if (auth === "authenticated") {
      const next = searchParams.get("next");
      const destination =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : getPath(locale, "/chat");
      router.replace(destination);
    }
  }, [auth, locale, router, searchParams]);

  function handleSuccess() {
    retryAuth();
  }

  if (auth === "authenticated") return null;

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
            className="rounded-xl bg-primary px-5 py-3 text-btn text-background transition hover:bg-primary-hover cursor-pointer"
          >
            {connectionErrorT("button")}
          </button>
        </div>
      </div>
    );
  }

  if (auth === "checking") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <main className="login-shell relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <div className="login-grid absolute inset-0 opacity-40" />

      <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <section className="hidden lg:block">
          <div className="mb-8 flex items-center gap-3">
            <Image src="/icons/logoFavicon.svg" alt="Zeyrix" width={38} height={38} />
            <span className="text-3xl font-display-en">ZEYRIX</span>
          </div>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-foreground">
            {t("mainHeader")}
          </h1>
          <p className="mt-6 max-w-md text-body-lg text-foreground-muted">
            {t("subHeader")}
          </p>
          <div className="mt-10 flex gap-3">
            {[t("tag1"), t("tag2"), t("tag3")].map((item, index) => (
              <div
                key={item}
                className="login-chip"
                style={{ animationDelay: `${index * 180}ms` }}
              >
                <span className="size-1.5 rounded-full bg-primary" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="login-card w-full max-w-md justify-self-center rounded-3xl border border-border/80 bg-surface/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <Image src="/icons/logoFavicon.svg" alt="Zeyrix" width={34} height={34} />
            <span className="text-2xl font-display-en">ZEYRIX</span>
          </div>
          <div className="mb-8">
            <h2 className="text-h1 text-foreground">{t("authTitle")}</h2>
            <p className="mt-2 text-body-sm text-foreground-muted">
              {t("authText")}
            </p>
          </div>

          <div className="space-y-3">
            <TelegramLoginButton onSuccess={handleSuccess} />
            <div className="flex items-center gap-3 py-2 text-caption text-foreground-muted">
              <span className="h-px flex-1 bg-border" />
              {t("or")}
              <span className="h-px flex-1 bg-border" />
            </div>
            {!anonymous ? (
              <button
                type="button"
                onClick={() => setAnonymous(true)}
                className="flex w-full items-center justify-center rounded-xl border border-border bg-elevated px-5 py-3 text-btn text-foreground-secondary transition hover:border-foreground-muted hover:bg-border/60 hover:cursor-pointer"
              >
                {t("continueAnonymously")}
              </button>
            ) : (
              <div className="rounded-xl border border-border bg-elevated/60 p-4">
                <p className="mb-3 text-body-sm text-foreground-secondary">
                  {t("wait")}
                </p>
                <TurnstileWidget onSuccess={handleSuccess} />
                <button
                  type="button"
                  onClick={() => setAnonymous(false)}
                  className="mt-3 text-caption text-foreground-muted underline underline-offset-4 hover:text-foreground"
                >
                  {t("anotherWay")}
                </button>
              </div>
            )}
          </div>

          <p className="mt-7 text-center text-caption text-foreground-muted">
            {t.rich("legalAgree", {
              privacyPolicy: (chunks) => (
                <Link
                  href="/legal/privacy-policy"
                  className="text-primary hover:text-primary-hover hover:underline"
                >
                  {chunks}
                </Link>
              ),
              termsOfUse: (chunks) => (
                <Link
                  href="/legal/terms-of-use"
                  className="text-primary hover:text-primary-hover hover:underline"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </section>
      </div>
    </main>
  );
}
