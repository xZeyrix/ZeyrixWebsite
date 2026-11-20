import { useTranslations } from "next-intl"
import TelegramIcon from "@/src/icons/telegram.svg";
import WhatsappIcon from "@/src/icons/whatsapp.svg";
import InstagramIcon from "@/src/icons/instagram.svg";
import TiktokIcon from "@/src/icons/tiktok.svg";

export function FooterDesktop() {
    const t = useTranslations("footer");
    const pages = useTranslations("menu");

    return (
        <div className="flex flex-col bg-background px-25 pt-12 gap-10">
            <div className="flex flex-row justify-between">
                <div className="flex flex-col items-center justify-center">
                    <h2 className="font-display-en font-light text-display">zeyrix</h2>
                    <p className="text-caption">{t("slogan")}</p>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <h3 className="text-h4">{t("pages")}</h3>

                    <div className="flex flex-col w-full max-w-150 text-caption text-foreground-secondary gap-1">
                        <p>{pages("home")}</p>
                        <p>{pages("services")}</p>
                        <p>{pages("cases")}</p>
                        <p>{pages("about")}</p>
                        <p>{pages("contact")}</p>
                        <p>{pages("zeyrixai")}</p>
                        <p>{pages("settings")}</p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <h3 className="text-h4">{t("contacts")}</h3>

                    <div className="flex flex-col w-full max-w-150 text-caption text-foreground-secondary gap-1">
                        <p>{t("callUs")}</p>
                        <p>{t("contactByEmail")}</p>
                        <p>{t("webChat")}</p>
                        <p>{t("telegramChat")}</p>
                    </div>
                </div>

                <div className="flex flex-row justify-between w-full max-w-50">
                    <TelegramIcon className="size-6" />
                    <WhatsappIcon className="size-6" />
                    <InstagramIcon className="size-6" />
                    <TiktokIcon className="size-6" />
                </div>
            </div>

            <div className="flex flex-row justify-between items-center gap-3 text-caption text-foreground-secondary border-t border-border py-3">
                <div className="flex flex-row w-full justify-between max-w-100 px-3">
                    <p>{t("privacyPolicy")}</p>
                    <p>{t("termsOfUse")}</p>
                </div>

                <p>© {new Date().getFullYear()} Zeyrix. {t("allRightsReserved")}.</p>
            </div>
        </div>
    )
}