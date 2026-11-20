import { HeaderMobile } from "./mobile";
import { HeaderDesktop } from "./desktop";

export function Header() {
    return (
        <>
        <div className="lg:hidden">
            <HeaderMobile />
        </div>
        <div className="hidden lg:inline">
            <HeaderDesktop />
        </div>
        </>
    )
}