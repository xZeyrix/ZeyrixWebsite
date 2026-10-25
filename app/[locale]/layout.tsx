import AuthGate from "@/src/components/auth/AuthGate";
import { ConnectionProvider } from "@/src/components/auth/ConnectionContext";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/src/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({
    locale,
  }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = (await import(`@/src/messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider messages={messages}>
      <ConnectionProvider>
        <AuthGate>{children}</AuthGate>
      </ConnectionProvider>
    </NextIntlClientProvider>
  );
}
