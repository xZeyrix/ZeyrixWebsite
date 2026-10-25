import { FooterMobile } from "@/src/components/footer/mobile";
import { HeaderMobile } from "@/src/components/header/mobile";
import { MainHero } from "@/src/components/home/hero";
import { MainServices } from "@/src/components/home/services";
import { HowItWorks } from "@/src/components/home/process";
import { MainWorks } from "@/src/components/home/works";
import { MainCTA } from "@/src/components/home/cta";
import { OpenAgentButton } from "@/src/components/reusable/buttons";
import { setRequestLocale } from "next-intl/server";
import LocaleAutoRedirect from "@/src/components/i18n/LocaleAutoRedirect";
import ProductionHomeRedirect from "@/src/components/i18n/ProductionHomeRedirect";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (process.env.IS_PRODUCTION === "true") {
    return <ProductionHomeRedirect locale={locale} />;
  }

  return (
    <>
      <LocaleAutoRedirect />
      <HeaderMobile />

      <MainHero />
      <MainServices />
      <HowItWorks />
      <MainWorks />
      <MainCTA />

      <OpenAgentButton />
      <FooterMobile />
    </>
  )
}
