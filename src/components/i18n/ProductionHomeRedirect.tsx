"use client";

import { useEffect } from "react";

export default function ProductionHomeRedirect({
  locale,
}: {
  locale: string;
}) {
  useEffect(() => {
    window.location.replace(`/${locale}/chat/`);
  }, [locale]);

  return <div className="min-h-dvh bg-background" />;
}
