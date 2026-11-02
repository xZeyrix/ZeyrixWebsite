"use client";

import { useTranslations } from "next-intl";
import { PrimaryButton, SecondaryButton } from "../reusable/buttons";
import { services, ServiceProps } from "@/src/data/services";
import { useRouter } from 'next/navigation';

function Service({ id, service }: ServiceProps) {
    const router = useRouter();

    return (
        <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col gap-6 items-center">
            <img src={service.preview.url} alt="image" className="rounded-lg" />
            
            <div className="flex flex-col gap-1 items-center">
                <h4 className="text-h4 text-center">{service.preview.title}</h4>
                <p className="text-body-sm text-center">{service.preview.text}</p>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <PrimaryButton text="Learn more →" onClick={() => router.push(`/services/${id}`)} />
                <SecondaryButton text="Ask AI" />
            </div>
        </div>
    )
}

export function MainServices() {
    const t = useTranslations("home");
    const router = useRouter();

    return (
        <div className="bg-background px-6 py-12 flex flex-col gap-10 items-center">
            <div className="flex flex-col w-full">
                <p className="text-overline text-primary">{t("servicesOverline")}</p>
                <h2 className="text-h2">{t("servicesTitle")}</h2>
            </div>

            <div className="flex flex-col gap-6">
                {Object.entries(services).map(([id, service]) => (
                    <Service key={id} id={id} service={service} />
                ))}
            </div>

            <PrimaryButton text={t("servicesButton")} mode="fit" onClick={() => router.push("/services")} />
        </div>
    )
}