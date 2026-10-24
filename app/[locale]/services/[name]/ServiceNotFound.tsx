"use client";

import { useRouter } from "next/router";
import { PrimaryButton } from "@/src/components/reusable/buttons";

export function ServiceNotFound() {
    const router = useRouter();

    return (
        <div className="flex flex-col justify-center items-center w-full h-dvh bg-background">
            <h1 className="text-h2">Not found</h1>
            <p className="text-body">This service doesn't exist</p>
            <PrimaryButton text="All services" mode="fit" onClick={() => router.push("services")} />
        </div>
    );
}