"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SiteSelector from "./site-selector";

export default function IngestForm() {
    const [input, setInput] = useState("");
    const [siteId, setSiteId] = useState("");
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
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    input: input.trim(),
                    siteId: siteId || undefined
                }),
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
            setSiteId("");
            toast.success(
                result.message || "Content ingested successfully!",
                { id: toastId }
            );
            router.refresh();
        } catch {
            toast.error("Network error. Please check your connection and try again.", { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-cloud-arrow-up text-lg text-primary" aria-hidden />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-base-content">Ingest Content</h3>
                        <p className="text-base-content/60 text-sm">Add web pages and documents to your knowledge base</p>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                    {/* Site Association */}
                    <div className="flex flex-col lg:flex-row gap-4">
                        <fieldset className="space-y-3">
                            <legend className="text-base font-semibold text-base-content mb-3">Site Association</legend>

                            <label className="block">
                                <span className="text-sm font-medium text-base-content mb-2 block">Associate with site (optional)</span>
                                <SiteSelector
                                    value={siteId}
                                    onChange={(value) => setSiteId(value || "")}
                                    allowNone={true}
                                    noneLabel="No specific site"
                                    placeholder="Select a site"
                                    disabled={loading}
                                />
                                <div className="text-xs text-base-content/60 mt-1">
                                    Content will be prioritized for the selected site&apos;s chat widget
                                </div>
                            </label>
                        </fieldset>

                        {/* Content Input */}
                        <fieldset className="space-y-3">
                            <legend className="text-base font-semibold text-base-content mb-3">Content Source</legend>

                            <label className="block">
                                <span className="text-sm font-medium text-base-content mb-2 block">
                                    URL or Sitemap
                                    <span className="text-error ml-1">*</span>
                                </span>
                                <div className="join w-full">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        type="url"
                                        placeholder="https://example.com or https://example.com/sitemap.xml"
                                        className={`input input-bordered join-item flex-1 focus:input-primary transition-all duration-200 focus:scale-[1.02] ${loading ? 'input-disabled' : ''}`}
                                        disabled={loading}
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className={`btn btn-primary join-item ${loading ? 'loading' : ''} min-w-32`}
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
                                <div className="text-xs text-base-content/60 mt-1">
                                    Enter a page URL to crawl that page, or a sitemap.xml URL to crawl multiple pages
                                </div>
                            </label>
                        </fieldset>
                    </div>
                </form>
            </div>
        </div>
    );
}
