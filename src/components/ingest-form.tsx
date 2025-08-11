"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IngestForm({ tenantId }: { tenantId: string }) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const router = useRouter();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        if (!input.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/ingest", {
                method: "POST",
                headers: { "content-type": "application/json", "x-tenant-id": tenantId },
                body: JSON.stringify({ input, tenantId }),
            });
            if (!res.ok) {
                let data: { error?: string; details?: Record<string, unknown> } | null = null;
                try { data = await res.json(); } catch { }
                if (res.status === 402 && data?.error === 'site limit reached') {
                    const d = data.details || {};
                    setErr(`Site limit reached: ${d.current ?? '?'} of ${d.limit ?? '?'} used on "${d.plan ?? 'starter'}". Host: ${d.host ?? ''}`);
                } else if (res.status === 402 && data?.error) {
                    setErr(String(data.error));
                } else {
                    setErr(data?.error || 'Ingestion failed.');
                }
                return;
            }
            setInput("");
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="w-full">
            <div className="join w-full">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    type="url"
                    placeholder="https://site.com or sitemap.xml"
                    className="input input-bordered join-item w-96"
                    required
                />
                <button className={`btn btn-primary join-item ${loading ? 'loading btn-disabled' : ''}`} disabled={loading}>
                    Ingest
                </button>
            </div>
            {err && (
                <div className="alert alert-warning mt-2">
                    <span>{err}</span>
                    <a className="link link-primary ml-2" href="/dashboard/billing">Manage billing</a>
                </div>
            )}
        </form>
    );
}
