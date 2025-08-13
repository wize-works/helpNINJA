"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import OnboardingProgress from "@/components/onboarding-progress";
import OnboardingNavigation from "@/components/onboarding-navigation";
import ChatPreview from "@/components/chat-preview";
import { useTenant } from "@/components/tenant-context";
import { AnimatedPage, StaggerContainer, StaggerChild } from "@/components/ui/animated-page";

const ONBOARDING_STEPS = [
    {
        id: 1,
        title: "Account Setup",
        description: "Confirm your account details and preferences",
        href: "/onboarding/step-1"
    },
    {
        id: 2,
        title: "Add Your Website",
        description: "Register the domains where you'll use the chat widget",
        href: "/onboarding/step-2"
    },
    {
        id: 3,
        title: "Install Widget",
        description: "Get your widget code and installation instructions",
        href: "/onboarding/step-3"
    }
];

type Site = {
    id: string;
    domain: string;
    name: string;
    verified: boolean;
};

type TenantInfo = {
    public_key: string;
    name: string;
};

export default function OnboardingStep3() {
    const router = useRouter();
    const { tenantId } = useTenant();
    const [sites, setSites] = useState<Site[]>([]);
    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string>("friendly");
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        async function load() {
            try {
                if (!tenantId) {
                    return;
                }

                const [sitesRes, infoRes] = await Promise.all([
                    fetch('/api/sites', {
                        headers: { 'x-tenant-id': tenantId },
                        signal: controller.signal
                    }),
                    fetch('/api/tenant/info', {
                        headers: { 'x-tenant-id': tenantId },
                        signal: controller.signal
                    })
                ]);

                if (sitesRes.ok) {
                    const data = await sitesRes.json();
                    if (!cancelled) setSites(data);
                }

                if (infoRes.ok) {
                    const data = await infoRes.json();
                    if (!cancelled) setTenantInfo(data);
                }
            } catch (error) {
                // Only log non-abort errors
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.error('Onboarding step-3 load error:', error);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        setLoading(true);
        load();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [tenantId]);

    function generateEmbedCode() {
        if (!tenantInfo?.public_key) return '';

        const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
        const voice = encodeURIComponent(selectedVoice);
        return `<script src="${origin}/api/widget?t=${tenantInfo.public_key}&voice=${voice}" async></script>`;
    }

    async function copyToClipboard() {
        const embedCode = generateEmbedCode();
        try {
            await navigator.clipboard.writeText(embedCode);
            setCopied(true);
            toast.success("Widget code copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy to clipboard");
        }
    }

    async function handleFinish() {
        toast.success("🎉 Setup complete! Welcome to helpNINJA!");
        router.push("/dashboard");
    }

    function handlePrev() {
        router.push("/onboarding/step-2");
    }

    if (loading) {
        return (
            <AnimatedPage>
                <div className="space-y-8">
                    <div className="skeleton h-8 w-64"></div>
                    <div className="skeleton h-96 w-full"></div>
                </div>
            </AnimatedPage>
        );
    }

    const embedCode = generateEmbedCode();
    const verifiedSites = sites.filter(site => site.verified);

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Progress Indicator */}
                <StaggerContainer>
                    <StaggerChild>
                        <OnboardingProgress currentStep={3} steps={ONBOARDING_STEPS} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Main Content */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="">
                            <div className="p-8">
                                {/* Header */}
                                <div className="text-center mb-8">
                                    <div className="w-20 h-20 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                        <i className="fa-duotone fa-solid fa-rocket text-success text-3xl" aria-hidden />
                                    </div>
                                    <h1 className="text-3xl font-bold text-base-content mb-2">
                                        You&apos;re Almost Ready!
                                    </h1>
                                    <p className="text-base-content/60 text-lg">
                                        Get your widget code and add it to your website to start helping customers instantly.
                                    </p>
                                </div>

                                {/* Widget Configuration */}
                                <div className="card bg-base-100 rounded-xl p-6 mb-6">
                                    <div className="space-y-4">
                                        <h2 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                                            <i className="fa-duotone fa-solid fa-sliders text-primary" aria-hidden />
                                            Widget Configuration
                                        </h2>

                                        <div className="form-control w-full max-w-xs">
                                            <label className="label">
                                                <span className="label-text font-medium">Voice & Tone</span>
                                            </label>
                                            <select
                                                className="select select-bordered w-full"
                                                value={selectedVoice}
                                                onChange={(e) => setSelectedVoice(e.target.value)}
                                            >
                                                <option value="friendly">Friendly</option>
                                                <option value="formal">Formal</option>
                                                <option value="casual">Casual</option>
                                                <option value="professional">Professional</option>
                                            </select>
                                            <label className="label">
                                                <span className="label-text-alt text-base-content/60">
                                                    Choose how your AI assistant should communicate
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Installation Code */}
                                <div className="card bg-base-100 rounded-xl p-6 mb-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-semibold text-base-content flex items-center gap-2">
                                                <i className="fa-duotone fa-solid fa-code text-primary" aria-hidden />
                                                Installation Code
                                            </h2>
                                            <button
                                                onClick={copyToClipboard}
                                                className={`btn btn-outline btn-sm ${copied ? 'btn-success' : ''}`}
                                            >
                                                <i className={`fa-duotone fa-solid ${copied ? 'fa-check' : 'fa-copy'} mr-2`} aria-hidden />
                                                {copied ? 'Copied!' : 'Copy Code'}
                                            </button>
                                        </div>

                                        <div className="bg-base-200/60 rounded-lg p-4">
                                            <pre className="text-sm overflow-x-auto">
                                                <code className="text-base-content">{embedCode}</code>
                                            </pre>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-base-content">Installation Instructions:</h3>
                                            <ol className="list-decimal list-inside space-y-2 text-sm text-base-content/70">
                                                <li>Copy the code snippet above</li>
                                                <li>Paste it into the <code className="bg-base-200 px-1 rounded">&lt;head&gt;</code> section of your website</li>
                                                <li>The widget will appear as a chat bubble in the bottom-right corner</li>
                                                <li>Test it by asking a question about your business</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>

                                {/* Live Preview */}
                                {tenantInfo?.public_key && (
                                    <div className="card bg-base-100 rounded-xl p-6 mb-6">
                                        <div className="space-y-4">
                                            <h2 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                                                <i className="fa-duotone fa-solid fa-eye text-primary" aria-hidden />
                                                Live Preview
                                            </h2>
                                            <p className="text-base-content/60 mb-4">
                                                See how your widget will look and behave on your website:
                                            </p>
                                            <ChatPreview
                                                tenantPublicKey={tenantInfo.public_key}
                                                voice={selectedVoice}
                                                height={400}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Verified Sites */}
                                {verifiedSites.length > 0 && (
                                    <div className="card bg-base-100 rounded-xl p-6 mb-6">
                                        <div className="space-y-4">
                                            <h2 className="text-lg font-semibold text-base-content mb-4 flex items-center gap-2">
                                                <i className="fa-duotone fa-solid fa-shield-check text-success" aria-hidden />
                                                Verified Websites
                                            </h2>
                                            <p className="text-base-content/60 mb-4">
                                                Your widget will work on these verified domains:
                                            </p>
                                            <div className="space-y-2">
                                                {verifiedSites.map((site) => (
                                                    <div key={site.id} className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                                                        <i className="fa-duotone fa-solid fa-globe text-success" aria-hidden />
                                                        <div>
                                                            <div className="font-semibold text-base-content">{site.name}</div>
                                                            <div className="text-sm text-base-content/60 font-mono">{site.domain}</div>
                                                        </div>
                                                        <div className="badge badge-success ml-auto">Verified</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Next Steps */}
                                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6">
                                    <div className="space-y-4">
                                        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                            <i className="fa-duotone fa-solid fa-stars" aria-hidden />
                                            What&apos;s Next?
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <h3 className="font-semibold text-base-content">Immediate Actions:</h3>
                                                <ul className="space-y-1 text-sm text-base-content/70">
                                                    <li className="flex items-center gap-2">
                                                        <i className="fa-duotone fa-solid fa-check text-success text-xs" aria-hidden />
                                                        Install the widget code on your website
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <i className="fa-duotone fa-solid fa-check text-success text-xs" aria-hidden />
                                                        Test the widget with sample questions
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <i className="fa-duotone fa-solid fa-check text-success text-xs" aria-hidden />
                                                        Add content to improve AI responses
                                                    </li>
                                                </ul>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="font-semibold text-base-content">Dashboard Features:</h3>
                                                <ul className="space-y-1 text-sm text-base-content/70">
                                                    <li className="flex items-center gap-2">
                                                        <i className="fa-duotone fa-solid fa-chart-line text-primary text-xs" aria-hidden />
                                                        Monitor conversations and analytics
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <i className="fa-duotone fa-solid fa-file-lines text-primary text-xs" aria-hidden />
                                                        Manage your knowledge base
                                                    </li>
                                                    <li className="flex items-center gap-2">
                                                        <i className="fa-duotone fa-solid fa-link text-primary text-xs" aria-hidden />
                                                        Set up integrations (Slack, Email)
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Navigation */}
                <StaggerContainer>
                    <StaggerChild>
                        <OnboardingNavigation
                            currentStep={3}
                            totalSteps={3}
                            nextLabel="Complete Setup"
                            onNext={handleFinish}
                            onPrev={handlePrev}
                        />
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}
