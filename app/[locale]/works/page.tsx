import { Header } from "@/src/components/header/main";
import { Footer } from "@/src/components/footer/main";
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
        <Header />

        <WorksHero />
        <WorksCatalog />
        <WorksCTA />
        
        <OpenAgentButton />
        <Footer />
    </div>)
}