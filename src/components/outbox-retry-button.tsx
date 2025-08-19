"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "./tenant-context";

export default function OutboxRetryButton() {
    const { tenantId } = useTenant();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    if (!tenantId) return null;

    async function onClick() {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch("/api/integrations/outbox/retry", {
                method: "POST",
                headers: { "content-type": "application/json" },
            });
            if (!res.ok) {
                console.error("Retry outbox failed", await res.text());
            }
        } catch (e) {
            console.error("Retry outbox error", e);
        } finally {
            setLoading(false);
            router.refresh();
        }
    }

    return (
        <button className="btn btn-sm rounded-lg" onClick={onClick} disabled={loading}>
            <i className="fa-duotone fa-arrows-rotate mr-2" aria-hidden />
            {loading ? "Retrying..." : "Retry outbox"}
        </button>
    );
}
