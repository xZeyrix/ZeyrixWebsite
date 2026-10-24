import { PrimaryButton } from "@/src/components/reusable/buttons";

export function WorksCTA() {
    return (
        <div className="bg-surface px-6 py-12 flex flex-col items-center gap-6">
            <h2 className="text-h2 text-center">Seen Enough? Let's Build Yours.</h2>

            <p className="text-body text-center">Every project on this page started with a single conversation.</p>
            <PrimaryButton text="Start a Conversation" mode="fit" />
        </div>
    );
}