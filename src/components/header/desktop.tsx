import MainLogo from "@/public/icons/logoMain.svg";
import MoonIcon from "@/src/icons/moon.svg";
import GlobusIcon from "@/src/icons/globus.svg";
import LoginIcon from "@/src/icons/login.svg";
import { PrimaryButton } from '../reusable/buttons';

export function HeaderDesktop() {
    return (
        <div className="fixed inset-0 bg-background h-17 flex flex-row justify-between items-center border-b border-border px-20 z-1">
            <div className="flex flex-row gap-2">
                <MainLogo className="size-7 text-primary" />
                <h2 className="font-display-en font-light text-h2">zeyrix</h2>
            </div>

            <div className="flex flex-row gap-10 text-nav">
                <a href="/" className="hover:underline">Home</a>
                <a href="/services" className="hover:underline">Services</a>
                <a href="/works" className="hover:underline">Case Studies</a>
                <a href="/about" className="hover:underline">About</a>
                <a href="/chat" className="hover:underline">ZeyrixAI</a>
                <a href="/contact" className="hover:underline">Contact</a>
            </div>

            <div className="flex flex-row gap-3 h-fit">
                <div className="border border-border px-5 py-2 rounded-lg">
                    <MoonIcon className="text-foreground size-6" />
                </div>
                <div className="border border-border px-5 py-2 rounded-lg">
                    <GlobusIcon className="text-foreground size-6" />
                </div>
                <div className="border border-border px-5 py-2 rounded-lg">
                    <LoginIcon className="text-foreground size-6" />
                </div>
                <PrimaryButton text="Discuss Your Project" height="small" mode="fit" />
            </div>
        </div>
    )
}