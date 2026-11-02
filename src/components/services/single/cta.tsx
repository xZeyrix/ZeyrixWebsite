import { ServiceProps } from "@/src/data/services";
import { PrimaryButton } from "@/src/components/reusable/buttons";

export function ServiceCTA({ service }: ServiceProps) {
    return (
        <div className="bg-surface px-6 py-12 flex flex-col items-center gap-6">
            <div className="flex flex-col gap-2 items-center">
                <p className="text-overline text-primary">/ LET’S TALK</p>
                <h2 className="text-h2 text-center">Got a Project in Mind?</h2>
            </div>

            <p className="text-body text-center">Tell us what you're building — we'll tell you honestly if and how we can help.</p>
            <PrimaryButton text="Contact Us" mode="fit" />
        </div>
    );
}