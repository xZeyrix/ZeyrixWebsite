import CloseIcon from "@/src/icons/close.svg";
import WhatsappIcon from "@/src/icons/whatsapp.svg";
import TelegramIcon from "@/src/icons/telegram.svg";
import InstagramIcon from "@/src/icons/instagram.svg";
import ContactIcon from "@/src/icons/redact.svg";
import { ContactButton } from "../reusable/contact";
import { useTranslations } from "next-intl";

type GetAccessModalProps = {
    onClose: () => void;
}

export function GetAccessModal({ onClose }: GetAccessModalProps) {
    const t = useTranslations("accessDisabled")

    const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE;
    const telegramUsername = process.env.NEXT_PUBLIC_TELEGRAM_USERNAME;
    const encodedMessage = encodeURIComponent(t("messageForSupport"));

    return (
        <div className="fixed inset-0 z-999 bg-black/90 w-full h-full flex items-center justify-center px-6">
            <div 
                className="bg-surface border border-border rounded-2xl relative flex flex-col p-6 min-w-0 gap-6 max-w-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div 
                    className="absolute top-1 right-1 p-4 hover:cursor-pointer group"
                    onClick={onClose}
                >
                    <CloseIcon className="size-3 text-foreground-muted group-hover:text-foreground" />
                </div>

                <div className="flex flex-col gap-3">
                    <p className="text-overline text-primary">{t("contactOverline")}</p>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-h3">{t("contactTitle")}</h3>
                        <p className="text-body-sm text-foreground-muted">{t("contactSubtitle")}</p>
                    </div>
                </div>

                <div className="flex flex-col min-w-0 gap-2">
                    <ContactButton Icon={WhatsappIcon} name="Whatsapp" note={t("whatsappNote")} url={whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodedMessage}` : null} />
                    <ContactButton Icon={TelegramIcon} name="Telegram" note={t("telegramNote")} url={telegramUsername ? `https://t.me/${telegramUsername}?text=${encodedMessage}` : null} />
                    <ContactButton Icon={InstagramIcon} name="Instagram" note={t("instagramNote")} url={null} />
                    <ContactButton Icon={ContactIcon} name="Send a message" note={t("contactNote")} url={null} />
                </div>
            </div>
        </div>
    );
}