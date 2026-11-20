import { FooterMobile } from "./mobile";
import { FooterDesktop } from "./desktop";

export function Footer() {
    return (
        <>
        <div className="lg:hidden">
            <FooterMobile />
        </div>
        <div className="hidden lg:inline">
            <FooterDesktop />
        </div>
        </>
    )
}