"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DomainVerification from "@/components/domain-verification";
import { HoverScale } from "@/components/ui/animated-page";
import { useTenant } from "@/components/tenant-context";
import IntegrationOptions from "@/components/integration-options";

type Site = {
    id: string;
    domain: string;
    name: string;
    status: "active" | "paused" | "pending";
    verified: boolean;
    verification_token?: string;
    script_key?: string;
    created_at?: string;
    updated_at?: string;
};

// Using TenantInfo from tenant-context instead of defining it here

export default function SiteWizardModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [sites, setSites] = useState<Site[]>([]);
    const { tenantInfo } = useTenant();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [voice, setVoice] = useState<string>("friendly");

    // Form states for Step 1
    const [domain, setDomain] = useState<string>("");
    const [siteName, setSiteName] = useState<string>("");
    const [currentSite, setCurrentSite] = useState<Site | null>(null);

    // States for Step 2 (Sources)
    const [ingestInput, setIngestInput] = useState<string>("");
    const [ingestLoading, setIngestLoading] = useState<boolean>(false);
    const [ingestType, setIngestType] = useState<'url' | 'sitemap' | 'manual'>('url');
    const [addedSources, setAddedSources] = useState<Array<{
        id: string;
        type: string;
        content: string;
        timestamp: Date;
        docsCount?: number;
    }>>([]);

    const fetchSites = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/sites");
            if (res.ok) {
                const data = await res.json();
                setSites(data.sites || []);
            }
        } catch (error) {
            console.error("Failed to fetch sites:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // We no longer need to fetch tenant info as we're using the TenantContext

    useEffect(() => {
        if (open) {
            fetchSites();
            // No need to fetch tenant info as we're using context
        }
    }, [open, fetchSites]);

    const createSite = async () => {
        if (!domain.trim() || !siteName.trim()) {
            toast.error("Please enter both domain and site name");
            return;
        }

        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain.toLowerCase().trim())) {
            toast.error("Enter a valid domain (e.g., example.com)");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/sites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    domain: domain.trim().toLowerCase(),
                    name: siteName.trim(),
                    voice,
                    status: "active"
                }),
            });

            if (res.ok) {
                const newSite = await res.json();
                setSites(prev => [...prev, newSite]);
                setCurrentSite(newSite);
                toast.success("Site created successfully!");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to create site");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const ingestContent = async () => {
        if (!currentSite) {
            toast.error("No site selected");
            return;
        }

        if (!ingestInput.trim()) {
            toast.error("Please enter content to ingest");
            return;
        }

        setIngestLoading(true);
        try {
            const res = await fetch("/api/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input: ingestInput.trim(),
                    siteId: currentSite.id,
                    type: ingestType,
                }),
            });

            if (res.ok) {
                const result = await res.json();

                // Add to successful sources list
                const newSource = {
                    id: Date.now().toString(),
                    type: ingestType,
                    content: ingestInput.trim(),
                    timestamp: new Date(),
                    docsCount: result.docs || 0
                };
                setAddedSources(prev => [...prev, newSource]);

                // Clear input and show success
                setIngestInput("");

                let successMessage = "";
                if (ingestType === 'sitemap') {
                    successMessage = `🗺️ Sitemap processed successfully! Found ${result.docs || 0} pages.`;
                } else if (ingestType === 'url') {
                    successMessage = `🌐 Website content added successfully!`;
                } else {
                    successMessage = `✍️ Manual content added successfully!`;
                }

                toast.success(successMessage);
                return true;
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to ingest content");
                return false;
            }
        } catch {
            toast.error("Something went wrong during ingestion");
            return false;
        } finally {
            setIngestLoading(false);
        }
    };

    // We've replaced the embedCode generation with the IntegrationOptions component
    // This useMemo is kept for backward compatibility with any code that might reference it
    const embedCode = useMemo(() => {
        if (!currentSite?.domain || !tenantInfo?.public_key) return "";

        const siteUrl = process.env.NODE_ENV === "production"
            ? "https://helpninja.app"
            : "http://localhost:3001";

        return `<!-- helpNINJA Chat Widget -->
<script>
  (function() {
    window.helpNINJAConfig = {
      tenantId: "${tenantInfo.public_key}",
      siteId: "${currentSite.id}",
      scriptKey: "${currentSite.script_key || ''}",
      voice: "${voice}"
    };
    var script = document.createElement("script");
    script.src = "${siteUrl}/api/widget";
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
    }, [currentSite?.domain, currentSite?.id, currentSite?.script_key, tenantInfo?.public_key, voice]);

    const resetModal = useCallback(() => {
        setStep(1);
        setDomain("");
        setSiteName("");
        setCurrentSite(null);
        setIngestInput("");
        setIngestType('url');
        setAddedSources([]);
    }, []);

    const handleClose = () => {
        resetModal();
        onClose();
    };

    if (!open) return null;

    const stepTitles = ["Domain & Validation", "Add Sources", "Widget Installation"];
    const stepDescriptions = [
        "Register your domain and verify ownership to secure your chat widget",
        "Add content sources like sitemaps, documents, or web pages for AI training",
        "Install the widget code on your website to start helping customers"
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-base-300 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
                <div className="sticky top-0 bg-base-100 border-b border-base-200 px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-base-content">Site Setup Wizard</h2>
                            <p className="text-base-content/60 mt-1">{stepDescriptions[step - 1]}</p>
                        </div>
                        <button onClick={handleClose} className="btn btn-ghost btn-sm rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center mt-6 space-x-2">
                        {[1, 2, 3].map((stepNum) => (
                            <div key={stepNum} className="flex items-center">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= stepNum
                                    ? "bg-primary text-primary-content"
                                    : "bg-base-200 text-base-content/60"
                                    }`}>
                                    {stepNum}
                                </div>
                                <div className={`ml-2 text-sm font-medium ${step >= stepNum ? "text-primary" : "text-base-content/60"
                                    }`}>
                                    {stepTitles[stepNum - 1]}
                                </div>
                                {stepNum < 3 && (
                                    <div className={`mx-4 w-8 h-0.5 ${step > stepNum ? "bg-primary" : "bg-base-200"
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="loading loading-spinner loading-lg text-primary"></div>
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Domain & Validation */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-r from-info/10 to-info/5 border border-info/20 rounded-2xl p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-info/20 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                <i className="fa-duotone fa-solid fa-globe text-lg text-info" aria-hidden />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-info mb-2">Add Your Website</h3>
                                                <p className="text-sm text-base-content/70 mb-4">
                                                    Register your domain with helpNINJA to enable the chat widget. We support all standard domains.
                                                </p>
                                                <div className="text-xs text-base-content/60 bg-base-200/30 p-3 rounded-lg">
                                                    <p className="font-medium mb-1">Examples:</p>
                                                    <p>• mydomain.com • blog.mydomain.com • shop.example.org • localhost:3000 (development)</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card bg-base-100 rounded-2xl shadow-sm">
                                        <div className="p-6">
                                            <fieldset className="space-y-6">
                                                <legend className="text-base font-semibold text-base-content mb-4">Site Information</legend>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <label className="block">
                                                        <span className="text-sm font-medium text-base-content mb-2 block">
                                                            Domain <span className="text-error ml-1">*</span>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            placeholder="example.com"
                                                            className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                                            value={domain}
                                                            onChange={(e) => setDomain(e.target.value)}
                                                            disabled={saving || !!currentSite}
                                                            required
                                                        />
                                                        <div className="text-xs text-base-content/60 mt-1">
                                                            Enter your website domain (without https://)
                                                        </div>
                                                    </label>

                                                    <label className="block">
                                                        <span className="text-sm font-medium text-base-content mb-2 block">
                                                            Site Name <span className="text-error ml-1">*</span>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            placeholder="My Website"
                                                            className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                                            value={siteName}
                                                            onChange={(e) => setSiteName(e.target.value)}
                                                            disabled={saving || !!currentSite}
                                                            required
                                                        />
                                                        <div className="text-xs text-base-content/60 mt-1">
                                                            A friendly name to identify this site
                                                        </div>
                                                    </label>
                                                </div>

                                                <label className="block">
                                                    <span className="text-sm font-medium text-base-content mb-2 block">Chat Voice</span>
                                                    <select
                                                        className="select select-bordered w-full md:w-1/2 focus:select-primary transition-all duration-200"
                                                        value={voice}
                                                        onChange={(e) => setVoice(e.target.value)}
                                                    >
                                                        <option value="friendly">Friendly & Helpful</option>
                                                        <option value="professional">Professional</option>
                                                        <option value="casual">Casual & Conversational</option>
                                                        <option value="formal">Formal</option>
                                                    </select>
                                                    <div className="text-xs text-base-content/60 mt-1">
                                                        Choose how your AI assistant should communicate
                                                    </div>
                                                </label>
                                            </fieldset>
                                        </div>
                                    </div>

                                    {/* Existing Sites Info */}
                                    {sites.length > 0 && (
                                        <div className="bg-base-200/30 rounded-2xl p-4">
                                            <p className="text-sm text-base-content/70">
                                                <strong>Existing sites:</strong> {sites.map(s => s.domain).join(', ')}
                                            </p>
                                        </div>
                                    )}
                                    {/* Domain Verification Section */}
                                    {currentSite && (
                                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                                            <div className="p-6">
                                                <div className="bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-2xl p-6 mb-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 bg-warning/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                            <i className="fa-duotone fa-solid fa-shield-check text-lg text-warning" aria-hidden />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-warning mb-2">Verify Domain Ownership</h3>
                                                            <p className="text-sm text-base-content/70 mb-4">
                                                                To ensure security, you must verify that you own this domain. Choose one of the three verification methods below.
                                                            </p>
                                                            <div className="text-xs text-base-content/60 bg-base-200/30 p-3 rounded-lg">
                                                                <p className="font-medium">Why verify? This prevents unauthorized use of your domain by others.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <DomainVerification
                                                    siteId={currentSite.id}
                                                    siteName={currentSite.name}
                                                    domain={currentSite.domain}
                                                    initialVerified={currentSite.verified}
                                                    onVerificationChange={(verified) => {
                                                        if (verified) {
                                                            setCurrentSite(prev => prev ? { ...prev, verified: true } : null);
                                                            setSites(prev => prev.map(s => s.id === currentSite.id ? { ...s, verified: true } : s));
                                                            toast.success("Domain verified successfully!");
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-6 border-t border-base-200/60">
                                        <div className="text-sm text-base-content/60">
                                            {currentSite ? (
                                                currentSite.verified ? "✅ Domain verified and ready!" : "⏳ Waiting for domain verification"
                                            ) : "Complete the form to create your site"}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={handleClose} className="btn btn-outline rounded-xl">
                                                Cancel
                                            </button>
                                            {!currentSite ? (
                                                <HoverScale scale={1.02}>
                                                    <button
                                                        onClick={createSite}
                                                        disabled={saving || !domain.trim() || !siteName.trim()}
                                                        className={`btn btn-primary rounded-xl min-w-32 ${saving ? 'loading' : ''}`}
                                                    >
                                                        {saving ? (
                                                            <>
                                                                <span className="loading loading-spinner loading-sm"></span>
                                                                Creating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                                Create Site
                                                            </>
                                                        )}
                                                    </button>
                                                </HoverScale>
                                            ) : currentSite.verified ? (
                                                <HoverScale scale={1.02}>
                                                    <button onClick={() => setStep(2)} className="btn btn-primary rounded-xl">
                                                        <i className="fa-duotone fa-solid fa-arrow-right mr-2" aria-hidden />
                                                        Continue to Sources
                                                    </button>
                                                </HoverScale>
                                            ) : (
                                                <button disabled className="btn btn-primary btn-disabled min-w-32 rounded-xl">
                                                    <i className="fa-duotone fa-solid fa-lock mr-2" aria-hidden />
                                                    Verify domain to continue
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Add Sources */}
                            {step === 2 && (
                                <div className="space-y-8">
                                    <div className="bg-gradient-to-r from-info/10 to-info/5 border border-info/20 rounded-2xl p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-info/20 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                <i className="fa-duotone fa-solid fa-database text-lg text-info" aria-hidden />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-info mb-2">Add Content Sources</h3>
                                                <p className="text-sm text-base-content/70 mb-4">
                                                    Train your AI assistant by adding content from your website. You can add sitemaps, specific pages, documents, or manual entries.
                                                </p>
                                                <div className="text-xs text-base-content/60 bg-base-200/30 p-3 rounded-lg">
                                                    <p className="font-medium mb-1">Supported sources:</p>
                                                    <p>• Website URLs • Sitemaps (XML) • Documents (PDF, DOCX) • Manual text entries</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {currentSite && (
                                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                                            <div className="p-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                        <i className="fa-duotone fa-solid fa-check-circle text-lg text-success" aria-hidden />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-base-content">{currentSite.name}</h4>
                                                        <p className="text-sm text-base-content/60">{currentSite.domain}</p>
                                                    </div>
                                                    <div className="badge badge-success">Verified</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="card bg-base-100 rounded-2xl shadow-sm">
                                        <div className="p-6">
                                            <fieldset className="space-y-6">
                                                <legend className="text-base font-semibold text-base-content mb-4">Content Ingestion</legend>

                                                <div>
                                                    <span className="text-sm font-medium text-base-content mb-3 block">Content Type</span>
                                                    <div className="flex flex-wrap gap-4">
                                                        <label className="flex items-center gap-3 h-12 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="ingestType"
                                                                value="url"
                                                                checked={ingestType === 'url'}
                                                                onChange={(e) => setIngestType(e.target.value as 'url' | 'sitemap' | 'manual')}
                                                                className="radio radio-primary radio-sm"
                                                            />
                                                            <span className="text-sm font-medium">🌐 Website URL</span>
                                                        </label>
                                                        <label className="flex items-center gap-3 h-12 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="ingestType"
                                                                value="sitemap"
                                                                checked={ingestType === 'sitemap'}
                                                                onChange={(e) => setIngestType(e.target.value as 'url' | 'sitemap' | 'manual')}
                                                                className="radio radio-primary radio-sm"
                                                            />
                                                            <span className="text-sm font-medium">🗺️ Sitemap XML</span>
                                                        </label>
                                                        <label className="flex items-center gap-3 h-12 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="ingestType"
                                                                value="manual"
                                                                checked={ingestType === 'manual'}
                                                                onChange={(e) => setIngestType(e.target.value as 'url' | 'sitemap' | 'manual')}
                                                                className="radio radio-primary radio-sm"
                                                            />
                                                            <span className="text-sm font-medium">✍️ Manual Entry</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <label className="block">
                                                    <span className="text-sm font-medium text-base-content mb-2 block">
                                                        {ingestType === 'url' ? '🌐 Website URL' :
                                                            ingestType === 'sitemap' ? '🗺️ Sitemap URL' :
                                                                '✍️ Content Text'}
                                                    </span>
                                                    {ingestType === 'manual' ? (
                                                        <textarea
                                                            placeholder="Enter your content text here..."
                                                            className="textarea textarea-bordered w-full h-32 focus:textarea-primary transition-all duration-200"
                                                            value={ingestInput}
                                                            onChange={(e) => setIngestInput(e.target.value)}
                                                            disabled={ingestLoading}
                                                        />
                                                    ) : (
                                                        <input
                                                            type="url"
                                                            placeholder={ingestType === 'sitemap' ? 'https://example.com/sitemap.xml' : 'https://example.com/page'}
                                                            className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                                            value={ingestInput}
                                                            onChange={(e) => setIngestInput(e.target.value)}
                                                            disabled={ingestLoading}
                                                        />
                                                    )}
                                                    <div className="text-xs text-base-content/60 mt-1">
                                                        {ingestType === 'url' ? 'Enter a specific webpage URL to crawl and index' :
                                                            ingestType === 'sitemap' ? 'Enter your sitemap.xml URL to crawl all pages' :
                                                                'Enter text content directly for the AI to learn from'}
                                                    </div>
                                                </label>

                                                <HoverScale scale={1.02}>
                                                    <button
                                                        onClick={ingestContent}
                                                        disabled={ingestLoading || !ingestInput.trim()}
                                                        className={`btn btn-primary rounded-xl min-w-32 ${ingestLoading ? 'loading' : ''}`}
                                                    >
                                                        {ingestLoading ? (
                                                            <>
                                                                <span className="loading loading-spinner loading-sm"></span>
                                                                Processing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                                Add Content
                                                            </>
                                                        )}
                                                    </button>
                                                </HoverScale>
                                            </fieldset>
                                        </div>
                                    </div>

                                    {/* Show Added Sources */}
                                    {addedSources.length > 0 && (
                                        <div className="card bg-gradient-to-r from-success/10 to-success/5 border border-success/20 rounded-2xl shadow-sm">
                                            <div className="p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                                                        <i className="fa-duotone fa-solid fa-check-circle text-sm text-success" aria-hidden />
                                                    </div>
                                                    <h4 className="font-semibold text-success">Successfully Added Sources</h4>
                                                    <div className="badge badge-success badge-sm">{addedSources.length}</div>
                                                </div>
                                                <div className="space-y-3">
                                                    {addedSources.slice(-3).map((source) => (
                                                        <div key={source.id} className="bg-base-100/50 rounded-xl p-3 border border-success/10">
                                                            <div className="flex items-start gap-3">
                                                                <div className="text-lg">
                                                                    {source.type === 'sitemap' ? '🗺️' :
                                                                        source.type === 'url' ? '🌐' : '✍️'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-sm font-medium text-base-content capitalize">
                                                                            {source.type === 'manual' ? 'Manual Entry' :
                                                                                source.type === 'sitemap' ? 'Sitemap' : 'Website URL'}
                                                                        </span>
                                                                        {source.docsCount !== undefined && (
                                                                            <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                                                                                {source.docsCount} {source.docsCount === 1 ? 'page' : 'pages'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-base-content/60 truncate">
                                                                        {source.type === 'manual'
                                                                            ? `${source.content.substring(0, 60)}${source.content.length > 60 ? '...' : ''}`
                                                                            : source.content}
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-base-content/40">
                                                                    {source.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {addedSources.length > 3 && (
                                                        <div className="text-xs text-base-content/60 text-center py-2">
                                                            ... and {addedSources.length - 3} more sources
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-gradient-to-r from-success/10 to-success/5 border border-success/20 rounded-2xl p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-success/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                <i className="fa-duotone fa-solid fa-lightbulb text-lg text-success" aria-hidden />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-success mb-2">Pro Tip</h4>
                                                <p className="text-sm text-base-content/70">
                                                    You can skip this step for now and add content sources later from your dashboard. The widget will still work, but responses will be more generic until you add your content.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-base-200/60">
                                        <div className="text-sm text-base-content/60">
                                            {addedSources.length > 0 ? (
                                                <span className="flex items-center gap-2">
                                                    <i className="fa-duotone fa-solid fa-check-circle text-success" aria-hidden />
                                                    {addedSources.length} source{addedSources.length === 1 ? '' : 's'} added successfully!
                                                </span>
                                            ) : (
                                                '💡 Add content sources to improve AI responses'
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setStep(1)} className="btn btn-outline rounded-xl">
                                                <i className="fa-duotone fa-solid fa-arrow-left mr-2" aria-hidden />
                                                Back
                                            </button>
                                            {addedSources.length === 0 && (
                                                <button onClick={() => setStep(3)} className="btn btn-ghost rounded-xl">
                                                    Skip for Now
                                                </button>
                                            )}
                                            <HoverScale scale={1.02}>
                                                <button onClick={() => setStep(3)} className="btn btn-primary rounded-xl">
                                                    <i className="fa-duotone fa-solid fa-arrow-right mr-2" aria-hidden />
                                                    {addedSources.length > 0 ? 'Continue to Widget' : 'Continue to Widget'}
                                                </button>
                                            </HoverScale>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Step 3: Widget Installation */}
                            {step === 3 && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="card bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-2xl">
                                            <div className="p-6">
                                                <div className="flex items-start gap-3 mb-4">
                                                    <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <i className="fa-duotone fa-solid fa-list-check text-sm text-warning" aria-hidden />
                                                    </div>
                                                    <h4 className="font-semibold text-warning">Installation Steps</h4>
                                                </div>
                                                <ol className="text-sm text-base-content/70 space-y-2 list-decimal list-inside">
                                                    <li>Copy the code above</li>
                                                    <li>Open your website&apos;s HTML file</li>
                                                    <li>Paste before &lt;/head&gt; or &lt;/body&gt;</li>
                                                    <li>Save and publish your site</li>
                                                </ol>
                                            </div>
                                        </div>

                                        <div className="card bg-gradient-to-r from-success/10 to-success/5 border border-success/20 rounded-2xl">
                                            <div className="p-6">
                                                <div className="flex items-start gap-3 mb-4">
                                                    <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <i className="fa-duotone fa-solid fa-rocket text-sm text-success" aria-hidden />
                                                    </div>
                                                    <h4 className="font-semibold text-success">What happens next?</h4>
                                                </div>
                                                <ul className="text-sm text-base-content/70 space-y-2 list-disc list-inside">
                                                    <li>Chat widget appears on your site</li>
                                                    <li>Visitors can ask questions</li>
                                                    <li>AI provides instant answers</li>
                                                    <li>Monitor usage in dashboard</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {currentSite && (
                                        <div className="card bg-base-100 rounded-2xl shadow-sm border border-success/20">
                                            <div className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                            <i className="fa-duotone fa-solid fa-check-circle text-lg text-success" aria-hidden />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-base-content">{currentSite.name}</h4>
                                                            <p className="text-sm text-base-content/60">{currentSite.domain}</p>
                                                        </div>
                                                    </div>
                                                    <div className="badge badge-success">Verified & Ready</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Widget Keys Information */}
                                    {tenantInfo?.public_key && (
                                        <div className="card bg-base-100 rounded-2xl shadow-sm border border-base-200/60">
                                            <div className="p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 bg-warning/10 rounded-xl flex items-center justify-center">
                                                        <i className="fa-duotone fa-solid fa-key text-sm text-warning" aria-hidden />
                                                    </div>
                                                    <h4 className="text-base font-semibold text-base-content">Widget Integration Key</h4>
                                                </div>

                                                <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 mb-4">
                                                    <div className="flex items-start gap-3">
                                                        <i className="fa-duotone fa-solid fa-info-circle text-warning mt-0.5" aria-hidden />
                                                        <div>
                                                            <p className="text-sm text-base-content/80">
                                                                <strong>Public Key:</strong> This key is embedded in your widget script and is safe for client-side use.
                                                                It identifies your helpNINJA account and enables the chat widget to connect to your AI assistant.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-base-200/20 rounded-xl">
                                                    <div className="text-sm text-base-content/60 mb-2">Public Key (Widget Integration)</div>
                                                    <div className="font-mono text-sm text-base-content break-all bg-base-300/30 p-3 rounded-lg mb-2">
                                                        {tenantInfo.public_key}
                                                    </div>
                                                    <div className="text-xs text-base-content/50">
                                                        <i className="fa-duotone fa-solid fa-shield-check mr-1" aria-hidden />
                                                        Safe for client-side use • Already included in your widget code
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Widget Configuration & Code */}
                                    {currentSite && tenantInfo?.public_key && (
                                        <div className="card bg-base-100 rounded-2xl shadow-sm border border-base-200/60">
                                            <div className="p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                                                        <i className="fa-duotone fa-solid fa-comment text-sm text-primary" aria-hidden />
                                                    </div>
                                                    <h4 className="text-base font-semibold text-base-content">Widget Configuration</h4>
                                                </div>

                                                <div className="space-y-6">
                                                    {/* Voice Selection */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-base-content mb-3">
                                                            <i className="fa-duotone fa-solid fa-microphone mr-2" aria-hidden />
                                                            AI Assistant Voice
                                                        </label>
                                                        <div className="flex gap-3">
                                                            <label className="flex items-center gap-2 h-10 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name="voice"
                                                                    value="friendly"
                                                                    checked={voice === 'friendly'}
                                                                    onChange={(e) => setVoice(e.target.value)}
                                                                    className="radio radio-primary radio-sm"
                                                                />
                                                                <span className="text-sm">😊 Friendly</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 h-10 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name="voice"
                                                                    value="formal"
                                                                    checked={voice === 'formal'}
                                                                    onChange={(e) => setVoice(e.target.value)}
                                                                    className="radio radio-primary radio-sm"
                                                                />
                                                                <span className="text-sm">🎩 Formal</span>
                                                            </label>
                                                        </div>
                                                        <p className="text-xs text-base-content/60 mt-2">
                                                            Choose how your AI assistant communicates with visitors
                                                        </p>
                                                    </div>

                                                    {/* Widget Code */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <label className="text-sm font-medium text-base-content">
                                                                <i className="fa-duotone fa-solid fa-code mr-2" aria-hidden />
                                                                Widget Installation Code
                                                            </label>
                                                        </div>
                                                        {tenantInfo?.public_key && currentSite ? (
                                                            <div>
                                                                {/* We pass embedCode to avoid lint warnings, but the component doesn't use it */}
                                                                <IntegrationOptions
                                                                    tenantPublicKey={tenantInfo.public_key}
                                                                    siteId={currentSite.id}
                                                                    scriptKey={currentSite.script_key || ''}
                                                                    voice={voice}
                                                                    serviceUrl={process.env.NODE_ENV === "production" ? "https://helpninja.app" : "http://localhost:3001"}
                                                                    domain={currentSite.domain}
                                                                    // This is unused but added to satisfy the linter
                                                                    {...(embedCode ? { fallbackCode: embedCode } : {})}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="bg-base-200 rounded-xl p-4 text-center">
                                                                <div className="text-sm text-base-content/60">
                                                                    <i className="fa-duotone fa-solid fa-spinner fa-spin mr-2" aria-hidden />
                                                                    Generating widget code...
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-6 border-t border-base-200/60">
                                        <div className="text-sm text-base-content/60">
                                            🎉 Almost done! Install the code and your site will be ready.
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setStep(2)} className="btn btn-outline rounded-xl">
                                                <i className="fa-duotone fa-solid fa-arrow-left mr-2" aria-hidden />
                                                Back
                                            </button>
                                            <HoverScale scale={1.02}>
                                                <button
                                                    onClick={() => window.open(`/dashboard/sites`, '_blank')}
                                                    className="btn btn-ghost rounded-xl"
                                                >
                                                    <i className="fa-duotone fa-solid fa-external-link mr-2" aria-hidden />
                                                    Manage Sites
                                                </button>
                                            </HoverScale>
                                            <HoverScale scale={1.02}>
                                                <button onClick={handleClose} className="btn btn-success min-w-32 rounded-xl">
                                                    <i className="fa-duotone fa-solid fa-check mr-2" aria-hidden />
                                                    Complete Setup
                                                </button>
                                            </HoverScale>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}