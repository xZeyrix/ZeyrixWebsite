import { ReactNode } from "react";
import { HeaderMobile } from "@/src/components/header/mobile";
import { FooterMobile } from "@/src/components/footer/mobile";
import { OpenAgentButton } from "@/src/components/reusable/buttons";
import LegalSectionNav from "./LegalSectionNav";

export default function LegalLayout({ children }: { children: ReactNode }) {
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
