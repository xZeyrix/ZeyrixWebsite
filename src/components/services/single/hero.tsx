import { PrimaryButton, GhostButton } from "@/src/components/reusable/buttons";
import { ServiceProps } from "@/src/data/services";

export function ServiceHero({ service }: ServiceProps) {
    return (
        <div className="bg-background px-6 py-12 flex flex-col gap-12">
            <div className="flex flex-col gap-4">
                <div className="text-caption flex flex-row gap-1">
                    <p className="text-primary">Services / </p>
                    <p className="text-foreground-muted">{service.title}</p>
                </div>

                <div className="flex flex-col gap-2">
                    <p className="text-overline text-primary">/ WHAT WE OFFER</p>
                    <h1 className="text-h1">{service.title}</h1>
                </div>
                
                <p className="text-body-lg text-foreground-secondary">{service.text}</p>
            </div>

            <div className="flex flex-col w-full jsutify-center items-center gap-3">
                <PrimaryButton text="Start a Project →" mode="fit" />
                <GhostButton text="See related cases →" mode="fit" />
            </div>
        </div>
    )
}