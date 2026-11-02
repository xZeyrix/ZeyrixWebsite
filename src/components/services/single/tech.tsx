import { ServiceProps, Tech } from "@/src/data/services";

function Technology({ Icon, name }: Tech) {
    return (
        <div className="bg-elevated border border-border p-4 rounded-lg flex flex-col gap-3 justify-center items-center min-w-25 shrink-0">
            <Icon className="size-7" />
            <p className="text-caption text-foreground-secondary">{name}</p>
        </div>
    );
}

export function ServiceTech({ service }: ServiceProps) {
    return (
        <div className="bg-surface flex flex-col px-6 py-12 gap-12">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <p className="text-overline text-primary">/ TECH STACK</p>
                    <h1 className="text-h2">Tools We Use for This</h1>
                </div>

                <p className="text-body text-foreground-secondary">Chosen for performance and maintainability — not hype.</p>
            </div>

            <div className="flex flex-row gap-3 overflow-x-auto">
                {service.tech.map((technology, index) => (
                    <Technology key={index} Icon={technology.Icon} name={technology.name} />
                ))}
            </div>
        </div>
    );
}