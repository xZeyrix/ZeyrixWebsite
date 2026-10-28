import { HeaderMobile } from "@/src/components/header/mobile";
import { FooterMobile } from "@/src/components/footer/mobile";
import { OpenAgentButton } from "@/src/components/reusable/buttons";
import { ServicesHero } from "@/src/components/services/all/hero";
import { ServicesCatalog } from "@/src/components/services/all/catalog";
import { ServicesTech } from "@/src/components/services/all/tech";
import { ServicesFAQ } from "@/src/components/services/all/faq";
import { ServicesCTA } from "@/src/components/services/all/cta";
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

        <ServicesHero />
        <ServicesCatalog />
        <ServicesTech />
        <ServicesFAQ />
        <ServicesCTA />
        
        <OpenAgentButton />
        <FooterMobile />
    </div>)
}