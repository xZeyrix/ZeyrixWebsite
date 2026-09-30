import CodeIcon from "@/src/icons/code.svg";

type OverviewStep = {
    Icon: any,
    title: string,
    text: string,
}

function OverviewCard({ Icon, title, text }: OverviewStep) {
    return (
        <div className="bg-elevated border border-border p-6 rounded-xl flex flex-col gap-3">
            <Icon className="size-5 text-primary" />
            <h4 className="text-h4">{title}</h4>
            <p className="text-body-sm text-foreground-secondary">{text}</p>
        </div>
    );
}

export function ServiceOverview() {
    const steps: OverviewStep[] = [
        { "Icon": CodeIcon, "title": "", "text": "" }
    ]

    return (
        <div className="bg-surface px-6 py-12 flex flex-col gap-12">
            <div className="flex flex-col gap-3">
                <p className="text-overline text-primary">/ OVERVIEW</p>
                <h2 className="text-h2">What’s Included</h2>
                <p className="text-body text-foreground-secondary">We cover the full cycle — from idea validation to production deployment.</p>
            </div>
        </div>
    )
}