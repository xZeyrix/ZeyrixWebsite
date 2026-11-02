"use client";

import { PrimaryButton, SecondaryButton } from "@/src/components/reusable/buttons";
import { services, ServiceProps } from "@/src/data/services";
import { useRouter } from "next/navigation";

function Tag({ text }: { text: string }) {
    return (
        <div className="bg-elevated text-foreground rounded-md px-3 py-1 text-caption shrink-0">
            {text}
        </div>
    );
}

function Service({ service, id }: ServiceProps) {
    const preview = service.preview;
    const router = useRouter();

    return (
        <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col gap-6 items-center">
            <img src={preview.url} alt="image" className="rounded-lg" />
            
            <div className="flex flex-col gap-3 items-center">
                <p className="text-overline text-primary-outline">01</p>

                <div className="flex flex-col gap-1 items-center">
                    <h4 className="text-h4 text-center">{preview.title}</h4>
                    <p className="text-body-sm text-center">{preview.text}</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <div className="w-full flex flex-row justify-center">
                    <div className="flex flex-row overflow-x-auto gap-2 w-fit">
                        {preview.tags.map((text) => (
                            <Tag key={text} text={text} />
                        ))}
                    </div>
                </div>
    
                <PrimaryButton text="Learn more →" onClick={() => router.push(`/services/${id}`)} />
                <SecondaryButton text="Ask AI" />
            </div>
        </div>
    )
}

export function ServicesCatalog() {
    return (
        <div className="bg-background px-6 py-12 flex flex-col gap-6">
            {Object.entries(services).map(([id, service]) => (
                <Service key={service.preview.title} service={service} id={id} />
            ))}
        </div>
    );
}