"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import OnboardingProgress from "@/components/onboarding-progress";
import OnboardingNavigation from "@/components/onboarding-navigation";
import DomainVerification from "@/components/domain-verification";
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
    status: 'active' | 'paused' | 'pending';
    verified: boolean;
    created_at: string;
};

export default function OnboardingStep2() {
    const router = useRouter();
    const { tenantId } = useTenant();
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [verifyingSite, setVerifyingSite] = useState<Site | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        domain: "",
        name: ""
    });

    useEffect(() => {
        loadSites();
    }, [tenantId]);

    async function loadSites() {
        try {
            const res = await fetch('/api/sites', {
                headers: { 'x-tenant-id': tenantId }
            });

            if (res.ok) {
                const data = await res.json();
                setSites(data);

                // If no sites exist, show the add form immediately
                if (data.length === 0) {
                    setShowAddForm(true);
                }
            }
        } catch (error) {
            console.error('Error loading sites:', error);
            toast.error("Failed to load websites");
        } finally {
            setLoading(false);
        }
    }

    async function handleAddSite() {
        if (!formData.domain.trim() || !formData.name.trim()) {
            toast.error('Please fill in all fields');
            return;
        }

        // Basic domain validation
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(formData.domain)) {
            toast.error('Please enter a valid domain name');
            return;
        }

        setSaving(true);
        const toastId = toast.loading('Adding website...');

        try {
            const res = await fetch('/api/sites', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify({
                    domain: formData.domain.toLowerCase(),
                    name: formData.name,
                    status: 'active'
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || 'Failed to add website', { id: toastId });
                return;
            }

            const result = await res.json();
            toast.success('Website added successfully!', { id: toastId });

            // Reset form and reload sites
            setFormData({ domain: '', name: '' });
            setShowAddForm(false);
            await loadSites();
        } catch (error) {
            toast.error('Network error. Please try again.', { id: toastId });
        } finally {
            setSaving(false);
        }
    }

    async function handleNext() {
        // Check if at least one site is registered
        if (sites.length === 0) {
            toast.error('Please add at least one website before continuing');
            return;
        }

        router.push("/onboarding/step-3");
    }

    function handlePrev() {
        router.push("/onboarding/step-1");
    }

    const hasVerifiedSite = sites.some(site => site.verified);
    const canProceed = sites.length > 0;

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

    return (
        <Suspense fallback={null}>
            <AnimatedPage>
                <div className="space-y-8">
                    {/* Progress Indicator */}
                    <StaggerContainer>
                        <StaggerChild>
                            <OnboardingProgress currentStep={2} steps={ONBOARDING_STEPS} />
                        </StaggerChild>
                    </StaggerContainer>

                    {/* Main Content */}
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="">
                                <div className="">
                                    <div className="p-8 text-center">
                                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                            <i className="fa-duotone fa-solid fa-globe text-primary text-3xl" aria-hidden />
                                        </div>
                                        <h1 className="text-3xl font-bold text-base-content mb-2">
                                            Add Your Websites
                                        </h1>
                                        <p className="text-base-content/60 text-lg">
                                            Register the domains where you want to use the chat widget. We&apos;ll verify ownership to keep your support secure.
                                        </p>
                                    </div>

                                    {/* Add Site Form */}
                                    {showAddForm && (
                                        <div className="card bg-base-100 rounded-xl p-6 mb-6">
                                            <div className="space-y-4">
                                                <h2 className="btn btn-primary rounded-xl">
                                                    <i className="fa-duotone fa-solid fa-plus text-primary" aria-hidden />
                                                    Add Website
                                                </h2>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="form-control">
                                                            <label className="label">
                                                                <span className="label-text">Domain *</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="example.com"
                                                                className="input input-bordered"
                                                                value={formData.domain}
                                                                onChange={(e) => setFormData({ ...formData, domain: e.target.value.toLowerCase() })}
                                                                disabled={saving}
                                                            />
                                                            <label className="label">
                                                                <span className="label-text-alt">
                                                                    Enter domain without https:// (e.g., jobsight.co)
                                                                </span>
                                                            </label>
                                                        </div>

                                                        <div className="form-control">
                                                            <label className="label">
                                                                <span className="label-text">Site Name *</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="My Website"
                                                                className="input input-bordered"
                                                                value={formData.name}
                                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                                disabled={saving}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => setShowAddForm(false)}
                                                            className="btn btn-ghost rounded-xl"
                                                            disabled={saving}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleAddSite}
                                                            className={`btn btn-primary rounded-xl ${saving ? 'loading' : ''}`}
                                                            disabled={saving || !formData.domain.trim() || !formData.name.trim()}
                                                        >
                                                            {saving ? (
                                                                <span className="loading loading-spinner loading-sm"></span>
                                                            ) : (
                                                                <>
                                                                    <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                                    Add Website
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sites List */}
                                    {sites.length === 0 && !showAddForm ? (
                                        <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-xl border border-base-200/60 shadow-sm">
                                            <div className="p-8 text-center">
                                                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                                    <i className="fa-duotone fa-solid fa-globe text-2xl text-primary" aria-hidden />
                                                </div>
                                                <h3 className="text-lg font-semibold mb-2">No websites added yet</h3>
                                                <p className="text-base-content/60 mb-6">
                                                    Add your first website to continue with the setup
                                                </p>
                                                <button
                                                    onClick={() => setShowAddForm(true)}
                                                    className="btn btn-primary rounded-xl"
                                                >
                                                    <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                    Add Your First Website
                                                </button>
                                            </div>
                                        </div>
                                    ) : sites.length > 0 ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-xl font-semibold">Your Websites</h2>
                                                {!showAddForm && (
                                                    <button
                                                        onClick={() => setShowAddForm(true)}
                                                        className="btn btn-outline btn-sm rounded-xl"
                                                    >
                                                        <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                        Add Another
                                                    </button>
                                                )}
                                            </div>

                                            {sites.map((site) => (
                                                <div key={site.id} className="card bg-base-100 border border-base-300">
                                                    <div className="card-body">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <h3 className="font-semibold text-lg">{site.name}</h3>
                                                                    <div className={`badge ${site.verified ? 'badge-success' : 'badge-warning'}`}>
                                                                        {site.verified ? 'Verified' : 'Needs Verification'}
                                                                    </div>
                                                                </div>
                                                                <p className="text-base-content/60 font-mono text-sm">{site.domain}</p>
                                                            </div>

                                                            {!site.verified && (
                                                                <button
                                                                    onClick={() => setVerifyingSite(site)}
                                                                    className="btn btn-primary btn-sm rounded-xl"
                                                                >
                                                                    <i className="fa-duotone fa-solid fa-shield-check mr-2" aria-hidden />
                                                                    Verify Domain
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    {/* Domain Verification Modal/Section */}
                                    {verifyingSite && (
                                        <div className="card bg-base-100 border border-primary">
                                            <div className="card-body">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h2 className="card-title">Verify {verifyingSite.name}</h2>
                                                    <button
                                                        onClick={() => setVerifyingSite(null)}
                                                        className="btn btn-ghost btn-sm rounded-xl"
                                                    >
                                                        <i className="fa-duotone fa-solid fa-times" aria-hidden />
                                                    </button>
                                                </div>
                                                <DomainVerification
                                                    siteId={verifyingSite.id}
                                                    siteName={verifyingSite.name}
                                                    domain={verifyingSite.domain}
                                                    tenantId={tenantId}
                                                    initialVerified={verifyingSite.verified}
                                                    onVerificationChange={(verified) => {
                                                        if (verified) {
                                                            setVerifyingSite(null);
                                                            loadSites(); // Refresh the sites list
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Info about verification */}
                                    {sites.length > 0 && !hasVerifiedSite && (
                                        <div className="card bg-base-100 rounded-xl border border-warning/20 p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                                    <i className="fa-duotone fa-solid fa-triangle-exclamation text-warning" aria-hidden />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base-content mb-1">Domain verification recommended</div>
                                                    <div className="text-sm text-base-content/70">
                                                        While you can continue without verification, we recommend verifying your domains for security and to prevent unauthorized use of your widget.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Success message */}
                                    {hasVerifiedSite && (
                                        <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl border border-success/20 p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-success/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                                    <i className="fa-duotone fa-solid fa-shield-check text-success" aria-hidden />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base-content mb-1">Great! Your domain is verified</div>
                                                    <div className="text-sm text-base-content/70">
                                                        Your chat widget will only work on verified domains, keeping your support secure.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>

                    {/* Navigation */}
                    <StaggerContainer>
                        <StaggerChild>
                            <OnboardingNavigation
                                currentStep={2}
                                totalSteps={3}
                                nextLabel="Continue to Widget Setup"
                                nextDisabled={!canProceed}
                                onNext={handleNext}
                                onPrev={handlePrev}
                                showSkip={true}
                            />
                        </StaggerChild>
                    </StaggerContainer>
                </div>
            </AnimatedPage>
        </Suspense>
    );
}
