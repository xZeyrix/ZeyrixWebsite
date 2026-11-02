import { ServiceProps } from "@/src/data/services";

type Step = {
    number: string,
    title: string,
    text: string,
}

type StepProps = {
    step: Step,
    isLast: boolean,
    isActive: boolean,
}

function Step({ step, isLast, isActive }: StepProps) {
    return (
        <div className="flex flex-col items-center w-70">
            <div className="flex flex-col gap-2 items-center">
                <div className={`${isActive ? "bg-primary" : "bg-surface border border-border"} rounded-full w-12 h-12 flex flex-row justify-center items-center`}>
                    <p className={`text-h4 ${isActive ? "text-background" : "text-primary"}`}>{step.number}</p>
                </div>

                <h4 className="text-h4 text-center">{step.title}</h4>
                <p className="text-body-sm text-center">{step.text}</p>
            </div>

            {!isLast && (
                <div className="h-20 border-l border-dashed border-border" />
            )}
        </div>
    );
}

export function ServiceProcess({ service }: ServiceProps) {
    const steps: Step[] = [
        { number: "01", title: "Discovery", text: "We learn your business, goals, and constraints in a focused kickoff call." },
        { number: "02", title: "Scoping", text: "We define features, timelines, and deliverables. You approve before we write a line of code." },
        { number: "03", title: "Development", text: "Iterative sprints. You see progress weekly — no waiting months for a surprise." },
        { number: "04", title: "Testing", text: "Automated tests + manual QA. Nothing ships without passing both." },
        { number: "05", title: "Launch", text: "We deploy, monitor the first 48 hours, and hand over full documentation." },
    ]

    return (
        <div className="bg-background flex flex-col px-6 py-12 gap-12">
            <div className="flex flex-col gap-3">
                <p className="text-overline text-primary">/ OUR PROCESS</p>
                <h2 className="text-h2">How We Work on This</h2>
                <p className="text-body text-foreground-secondary">No black boxes. You always know what's happening and why.</p>
            </div>

            <div className="flex flex-col items-center">
                {steps.map((step, index) => (
                    <Step key={index} step={step} isLast={index === steps.length - 1} isActive={index === 0} />
                ))}
            </div>
        </div>
    )
}