import { useState, useCallback, Dispatch, SetStateAction } from "react";
import { apiFetch } from "../lib/api";

export function useStep() {
    const [error, setError] = useState<string | null>(null);

    const undoTool = useCallback(async (auditLogId: string, setIsUndone: Dispatch<SetStateAction<boolean>>) => {
        setError(null);

        try {
            const res = await apiFetch("/api/tools/undo", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ auditLogId: auditLogId, allowPartial: false }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.code === "VALIDATION") {
                    setIsUndone(true);
                    throw new Error(`This tool has been undone already`);
                }
                throw new Error(`Backend returned ${res.status}`);
            }
            setIsUndone(true);
        } catch (err) {
            const error = err instanceof Error ? err.message : "Failed to undo a tool";

            setError(error);
            throw err;
        }
    }, []);

    return { error, undoTool };
}