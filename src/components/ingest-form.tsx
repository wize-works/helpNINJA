"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function IngestForm({ tenantId }: { tenantId: string }) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim()) {
            toast.error("Please enter a valid URL");
            return;
        }

        // Basic URL validation
        try {
            new URL(input.trim());
        } catch {
            toast.error("Please enter a valid URL");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Ingesting content...");

        try {
            const res = await fetch("/api/ingest", {
                method: "POST",
                headers: { "content-type": "application/json", "x-tenant-id": tenantId },
                body: JSON.stringify({ input: input.trim(), tenantId }),
            });

            if (!res.ok) {
                let data: { error?: string; details?: Record<string, unknown> } | null = null;
                try { data = await res.json(); } catch { }
                
                if (res.status === 402 && data?.error === 'site limit reached') {
                    const d = data.details || {};
                    toast.error(
                        `Site limit reached: ${d.current ?? '?'} of ${d.limit ?? '?'} used on "${d.plan ?? 'starter'}". Host: ${d.host ?? ''}`,
                        { id: toastId, duration: 6000 }
                    );
                } else if (res.status === 402 && data?.error) {
                    toast.error(String(data.error), { id: toastId });
                } else {
                    toast.error(data?.error || 'Ingestion failed. Please try again.', { id: toastId });
                }
                return;
            }

            const result = await res.json();
            setInput("");
            toast.success(
                result.message || "Content ingested successfully!", 
                { id: toastId }
            );
            router.refresh();
        } catch (error) {
            toast.error("Network error. Please check your connection and try again.", { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="w-full">
            <div className="form-control w-full">
                <div className="join w-full">
                    <div className="form-control join-item flex-1">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            type="url"
                            placeholder="https://example.com or https://example.com/sitemap.xml"
                            className={`input input-bordered join-item w-full ${loading ? 'input-disabled' : ''}`}
                            disabled={loading}
                            required
                        />
                    </div>
                    <button 
                        type="submit"
                        className={`btn btn-primary join-item ${loading ? 'loading' : ''}`} 
                        disabled={loading || !input.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Ingesting...
                            </>
                        ) : (
                            <>
                                <i className="fa-duotone fa-solid fa-cloud-arrow-up mr-2" aria-hidden />
                                Ingest
                            </>
                        )}
                    </button>
                </div>
                <label className="label">
                    <span className="label-text-alt">
                        Enter a page URL to crawl that page, or a sitemap.xml URL to crawl multiple pages
                    </span>
                </label>
            </div>
        </form>
    );
}
