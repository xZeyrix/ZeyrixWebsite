import { HeaderMobile } from "@/src/components/header/mobile";
import { FooterMobile } from "@/src/components/footer/mobile";
import { OpenAgentButton } from "@/src/components/reusable/buttons";
import { WorksHero } from "@/src/components/works/all/hero";
import { WorksCatalog } from "@/src/components/works/all/catalog";
import { WorksCTA } from "@/src/components/works/all/cta";

export default function Services() {
    return (<div className="mt-14">
        <HeaderMobile />

        <WorksHero />
        <WorksCatalog />
        <WorksCTA />
        
        <OpenAgentButton />
        <FooterMobile />
    </div>)
}