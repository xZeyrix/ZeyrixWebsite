import { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/src/components/header/main";
import { Footer } from "@/src/components/footer/main";
import { OpenAgentButton } from "@/src/components/reusable/buttons";
import LegalSectionNav from "./LegalSectionNav";

export default async function LegalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="legal-page">
      <Header />
      <LegalSectionNav />
      <main className="legal-content">{children}</main>
      <OpenAgentButton />
      <Footer />
    </div>
  );
}
