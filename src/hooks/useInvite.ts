import { useCallback } from "react";
import { AccessInvite } from "../types/chat";
import { useConnection } from "../components/auth/ConnectionContext";
import { apiFetch } from "../lib/api";

export function useInvite(token?: string) {
    const { setAccess } = useConnection();

    const getInvite = useCallback(async (): Promise<AccessInvite> => {
        const response = await apiFetch(`/api/invites/${token}`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            return { status: "notFound" };
        }

        const data: AccessInvite = await response.json();
        return data;
    }, [token])

    const activateInvite = useCallback(async () => {
        const response = await apiFetch("/api/invites/activate", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token }),
        });

        if (!response.ok) {
            throw new Error("Not activated")
        }

        setAccess("granted");
    }, [token])

    return { getInvite, activateInvite };
}