"use client";

import { useTranslations } from "next-intl"
import { PrimaryButton, SecondaryButton } from "../reusable/buttons"
import { works, WorkProps } from "@/src/data/works";
import { useRouter } from 'next/navigation';

function Work({ work, id }: WorkProps) {
    const router = useRouter();

    return (
        <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col gap-6 items-center">
            <img src={work.preview.url} alt="image" className="rounded-lg" />
            
            <div className="flex flex-col gap-1 items-center">
                <h4 className="text-h4 text-center">{work.preview.title}</h4>
                <p className="text-body-sm text-center">{work.preview.text}</p>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <PrimaryButton text="Learn more →" onClick={() => router.push(`/works/${id}`)} />
                <SecondaryButton text="Ask AI" />
            </div>
        </div>
    )
}

export function MainWorks() {
    const t = useTranslations("home");
    const router = useRouter();

    return (
        <div className="bg-background px-6 py-12 flex flex-col gap-10 items-center">
            <div className="flex flex-col w-full">
                <p className="text-overline text-primary">{t("worksOverline")}</p>
                <h2 className="text-h2">{t("worksTitle")}</h2>
            </div>

            <div className="flex flex-col gap-6">
                {Object.entries(works).map(([id, work]) => (
                    <Work key={id} id={id} work={work} />
                ))}
            </div>

            <PrimaryButton text={t("worksButton")} mode="fit" onClick={() => router.push("/works")} />
        </div>
    )
}