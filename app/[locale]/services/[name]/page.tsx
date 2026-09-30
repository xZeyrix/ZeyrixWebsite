"use client";

import { HeaderMobile } from "@/src/components/header/mobile";
import { FooterMobile } from "@/src/components/footer/mobile";
import { OpenAgentButton } from "@/src/components/reusable/buttons";
import { ServiceHero } from "@/src/components/services/single/hero";
import { ServiceOverview } from "@/src/components/services/single/overview";
import { ServiceProcess } from "@/src/components/services/single/process";
import { ServiceTech } from "@/src/components/services/single/tech";
import { ServiceRelatedCases } from "@/src/components/services/single/relatedCases";
import { ServiceFAQ } from "@/src/components/services/single/faq";
import { ServiceCTA } from "@/src/components/services/single/cta";
import { useParams } from 'next/navigation';
import { ServiceNotFound } from './ServiceNotFound';
import { services } from '../../../../src/data/services';

export default function Service() {
    const params = useParams<{ name?: string | string[] }>();
    const serviceName = Array.isArray(params.name)
        ? params.name[0]
        : params.name;

    const currentService = services[serviceName ?? ""];

    return (
        <>
        {currentService ? (
            <div className="mt-14">
                <HeaderMobile />

                <ServiceHero service={currentService} />
                <ServiceOverview />
                <ServiceProcess />
                <ServiceTech />
                <ServiceRelatedCases />
                <ServiceFAQ />
                <ServiceCTA />

                <OpenAgentButton />
                <FooterMobile />
            </div>
        ) : (
            <ServiceNotFound />
        )}
        </>
    );
}