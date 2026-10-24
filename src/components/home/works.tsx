import { useTranslations } from "next-intl"
import { PrimaryButton, SecondaryButton } from "../reusable/buttons"
import { works } from "@/src/data/works";

interface Work {
    id: number,
    title: string,
    text: string,
    url: string,
}

function Work({ title, text, url }: Work) {
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

export function MainWorks() {
    const t = useTranslations("home");
    const worksArray = Object.values(works);

    return (
        <div className="bg-background px-6 py-12 flex flex-col gap-10 items-center">
            <div className="flex flex-col w-full">
                <p className="text-overline text-primary">{t("worksOverline")}</p>
                <h2 className="text-h2">{t("worksTitle")}</h2>
            </div>

            <div className="flex flex-col gap-6">
                {worksArray.map((work) => (
                    <Work key={work.preview.title} title={work.preview.title} text={work.preview.title} url={work.preview.url} />
                ))}
            </div>

            <PrimaryButton text={t("worksButton")} mode="fit" />
        </div>
    )
}