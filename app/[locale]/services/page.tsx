import { HeaderMobile } from "@/src/components/header/mobile";
import { FooterMobile } from "@/src/components/footer/mobile";
import { OpenAgentButton } from "@/src/components/reusable/buttons";
import { ServicesHero } from "@/src/components/services/all/hero";
import { ServicesCatalog } from "@/src/components/services/all/catalog";
import { ServicesTech } from "@/src/components/services/all/tech";
import { ServicesFAQ } from "@/src/components/services/all/faq";
import { ServicesCTA } from "@/src/components/services/all/cta";
import { notFound } from "next/navigation";

export default function Services() {
    if (process.env.IS_PRODUCTION === "true") {
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