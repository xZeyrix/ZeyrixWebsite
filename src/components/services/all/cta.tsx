import { PrimaryButton } from "@/src/components/reusable/buttons";

export function ServicesCTA() {
    return (
        <div className="bg-surface px-6 py-12 flex flex-col items-center gap-6">
            <div className="flex flex-col gap-2 items-center">
                <p className="text-overline text-primary">/ READY?</p>
                <h2 className="text-h2 text-center">Let's Discuss Your Project</h2>
            </div>

            <p className="text-body text-center">Tell us what you're building — we'll figure out the best way to help.</p>
            <PrimaryButton text="Contact Us" mode="fit" />
        </div>
    );
}