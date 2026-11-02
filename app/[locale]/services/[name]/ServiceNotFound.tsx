"use client";

import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/src/components/reusable/buttons";

export function ServiceNotFound() {
    const router = useRouter();

    return (
        <div className="flex flex-col justify-center items-center w-full h-dvh bg-background gap-3">
            <h1 className="text-h1">Not found</h1>
            <p className="text-body-lg">This service doesn't exist</p>
            <PrimaryButton text="All services →" mode="fit" onClick={() => router.push("/services")} />
        </div>
    );
}