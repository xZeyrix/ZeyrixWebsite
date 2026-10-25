"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const supportedLocales = ["en", "ru", "kk"] as const;

export default function LocaleAutoRedirect() {
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    const preferredLocale = navigator.languages
      .map((language) => language.split("-")[0])
      .find((language) =>
        supportedLocales.includes(language as (typeof supportedLocales)[number]),
      );

    if (preferredLocale && preferredLocale !== locale) {
      router.replace(`/${preferredLocale}/`);
    }
  }, [locale, router]);

  return null;
}
