import type { Metadata } from "next";
import { Inter, Anton_SC, Oswald } from "next/font/google";
import "./globals.css";
import AuthGate from "@/src/components/auth/AuthGate";
import { ConnectionProvider } from "@/src/components/auth/ConnectionContext";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/src/i18n/routing";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const antonSC = Anton_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const oswald = Oswald({
  weight: "700",
  subsets: ["cyrillic"],
  variable: "--font-oswald",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zeyrix",
  description: "AI Software, Built for Real Business",
};

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
    <html
      lang={locale}
      className={`${inter.variable} ${antonSC.variable} ${oswald.variable}`}
    >
      <body className="font-sans antialiased bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <ConnectionProvider>
            <AuthGate>{children}</AuthGate>
          </ConnectionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
