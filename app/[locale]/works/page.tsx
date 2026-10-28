import { HeaderMobile } from "@/src/components/header/mobile";
import { FooterMobile } from "@/src/components/footer/mobile";
import { OpenAgentButton } from "@/src/components/reusable/buttons";
import { WorksHero } from "@/src/components/works/all/hero";
import { WorksCatalog } from "@/src/components/works/all/catalog";
import { WorksCTA } from "@/src/components/works/all/cta";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function Services({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    if (process.env.NEXT_PUBLIC_IS_PRODUCTION === "true") {
        notFound();
    }

    return (<div className="mt-14">
        <HeaderMobile />

        <WorksHero />
        <WorksCatalog />
        <WorksCTA />
        
        <OpenAgentButton />
        <FooterMobile />
    </div>)
}