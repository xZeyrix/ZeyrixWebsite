"use client";

import { useEffect } from "react";

const supportedLocales = ["en", "ru", "kk"] as const;

export default function LocaleRedirectPage() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const targetPath = url.searchParams.get("path") || url.pathname;
    const preferredLocale =
      navigator.languages
        .map((language) => language.split("-")[0])
        .find((language) =>
          supportedLocales.includes(
            language as (typeof supportedLocales)[number],
          ),
        ) ?? "en";

    const target = new URL(
      `/${preferredLocale}${targetPath === "/" ? "/" : targetPath}`,
      window.location.origin,
    );
    url.searchParams.delete("path");
    target.search = url.searchParams.toString();
    window.location.replace(target.toString());
  }, []);

  return <div className="min-h-dvh bg-background" />;
}
