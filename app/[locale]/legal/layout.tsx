import { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { HeaderMobile } from "@/src/components/header/mobile";
import { FooterMobile } from "@/src/components/footer/mobile";
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
      <HeaderMobile />
      <LegalSectionNav />
      <main className="legal-content">{children}</main>
      <OpenAgentButton />
      <FooterMobile />
    </div>
  );
}
