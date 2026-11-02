import CodeIcon from "@/src/icons/code.svg";
import DiscoveryIcon from "@/src/icons/layout.svg";
import QAIcon from "@/src/icons/check.svg";
import DeployIcon from "@/src/icons/deploy.svg";
import { ServiceProps } from "@/src/data/services";

type OverviewStep = {
    Icon: any,
    title: string,
    text: string,
}

function OverviewCard({ Icon, title, text }: OverviewStep) {
    return (
        <div className="bg-elevated border border-border p-6 rounded-xl flex flex-col gap-3 justify-center items-center">
            <Icon className="size-5 text-primary" />
            <h4 className="text-h4 text-center">{title}</h4>
            <p className="text-body-sm text-foreground-secondary text-center">{text}</p>
        </div>
    );
}

export function ServiceOverview({ service }: ServiceProps) {
    const steps: OverviewStep[] = [
        { "Icon": DiscoveryIcon, "title": "Discovery & Planning", "text": "We start by mapping your business logic, defining user flows, and agreeing on a clear technical scope." },
        { "Icon": CodeIcon, "title": "Development & Architecture", "text": "We build clean, maintainable code on a stack chosen for your specific needs — not our convenience." },
        { "Icon": QAIcon, "title": "QA & Testing", "text": "Every feature is tested manually and automatically before it ever reaches your users." },
        { "Icon": DeployIcon, "title": "Launch & Handover", "text": "We deploy to production, document everything, and make sure your team can own what we built." },
    ]

    return (
        <div className="bg-surface px-6 py-12 flex flex-col gap-12">
            <div className="flex flex-col gap-3">
                <p className="text-overline text-primary">/ OVERVIEW</p>
                <h2 className="text-h2">What’s Included</h2>
                <p className="text-body text-foreground-secondary">We cover the full cycle — from idea validation to production deployment.</p>
            </div>

            <div className="flex flex-col gap-3">
                {steps.map((step) => (
                    <OverviewCard key={step.title} Icon={step.Icon} title={step.title} text={step.text} />
                ))}
            </div>
        </div>
    )
}