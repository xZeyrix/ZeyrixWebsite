"use client";

import SparkleIcon from "@/src/icons/sparkle.svg";
import { useRouter } from "next/navigation";

export function PrimaryButton({ text, mode = "full", onClick }: { text: string, mode?: "fit" | "full", onClick?: () => void }) {
    return (
        <button 
            className={`py-4 px-6 bg-primary text-background rounded-lg text-btn text-center w-${mode}`}
            onClick={() => onClick && onClick()}
        >
            {text}
        </button>
    )
}

export function SecondaryButton({ text, mode = "full", onClick }: { text: string, mode?: "fit" | "full", onClick?: () => void }) {
    return (
        <button 
            className={`py-4 px-6 border border-primary text-primary rounded-lg text-btn text-center w-${mode}`}
            onClick={() => onClick && onClick()}
        >
            {text}
        </button>
    )
}

export function PrimaryBlackButton({ text, mode = "full", onClick }: { text: string, mode?: "fit" | "full", onClick?: () => void }) {
    return (
        <button 
            className={`py-4 px-6 bg-background text-foreground rounded-lg text-btn text-center w-${mode}`}
            onClick={() => onClick && onClick()}
        >
            {text}
        </button>
    )
}

export function OpenAgentButton() {
    const router = useRouter();

    return (
        <button 
            className="fixed bottom-6 right-6 bg-primary p-3 rounded-lg border border-primary-outline"
            onClick={() => router.push("/chat")}
        >
            <SparkleIcon className="size-4 text-background" />
        </button>
    );
}

export function GhostButton({ text, mode = "full", onClick }: { text: string, mode?: "fit" | "full", onClick?: () => void }) {
    return (
        <button 
            className={`py-4 px-6 text-foreground-secondary rounded-lg text-btn text-center w-${mode}`}
            onClick={() => onClick && onClick()}
        >
            {text}
        </button>
    )
}