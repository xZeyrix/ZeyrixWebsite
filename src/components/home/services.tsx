import { useTranslations } from "next-intl";
import { PrimaryButton, SecondaryButton } from "../reusable/buttons";
import { services } from "@/src/data/services";

function Service({ title, text, url }: Service) {
    return (
        <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col gap-6 items-center">
            <img src={url} alt="image" className="rounded-lg" />
            
            <div className="flex flex-col gap-1 items-center">
                <h4 className="text-h4 text-center">{title}</h4>
                <p className="text-body-sm text-center">{text}</p>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <PrimaryButton text="Primary" />
                <SecondaryButton text="Secondary" />
            </div>
        </div>
    )
}

export function MainServices() {
    const t = useTranslations("home");
    const servicesArray = Object.values(services);

    return (
        <div className="bg-background px-6 py-12 flex flex-col gap-10 items-center">
            <div className="flex flex-col w-full">
                <p className="text-overline text-primary">{t("servicesOverline")}</p>
                <h2 className="text-h2">{t("servicesTitle")}</h2>
            </div>

            <div className="flex flex-col gap-6">
                {servicesArray.map((service) => (
                    <Service key={service.preview.title} title={service.preview.title} text={service.preview.text} url={service.preview.url} />
                ))}
            </div>

            <PrimaryButton text={t("servicesButton")} mode="fit" />
        </div>
    )
}