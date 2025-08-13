"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import OnboardingProgress from "@/components/onboarding-progress";
import OnboardingNavigation from "@/components/onboarding-navigation";
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

type TenantInfo = {
    id: string;
    name: string;
    plan: string;
    plan_status: string;
    public_key: string;
    secret_key: string;
};

export default function OnboardingStep1() {
    const router = useRouter();
    const { tenantId } = useTenant();
    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        companyName: "",
        industry: "",
        teamSize: "",
        useCase: ""
    });

    useEffect(() => {
        if (tenantId) {
            loadTenantInfo();
        }
    }, [tenantId]);

    async function loadTenantInfo() {
        try {
            // For now, we'll just confirm the tenant exists and has keys
            // In a real implementation, you might fetch more details
            setTenantInfo({
                id: tenantId,
                name: "Your Company", // This would come from the tenant data
                plan: "starter",
                plan_status: "active",
                public_key: "hn_pk_...", // This would be real data
                secret_key: "hn_sk_..." // This would be real data
            });

            setFormData({
                companyName: "Your Company", // Pre-fill with existing data if available
                industry: "",
                teamSize: "",
                useCase: ""
            });
        } catch (error) {
            console.error("Error loading tenant info:", error);
            toast.error("Failed to load account information");
        } finally {
            setLoading(false);
        }
    }

    async function handleNext() {
        if (!formData.companyName.trim()) {
            toast.error("Please enter your company name");
            return;
        }

        setSaving(true);

        try {
            // In a real implementation, you would save the tenant preferences here
            // For now, we'll just simulate saving and move to the next step
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success("Account setup completed!");
            router.push("/onboarding/step-2");
        } catch (error) {
            toast.error("Failed to save account information");
        } finally {
            setSaving(false);
        }
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

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Progress Indicator */}
                <StaggerContainer>
                    <StaggerChild>
                        <OnboardingProgress currentStep={1} steps={ONBOARDING_STEPS} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Main Content */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="space-y-8">
                            <div className="">
                                <div className="text-center mb-8">
                                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                        <i className="fa-duotone fa-solid fa-building text-primary text-3xl" aria-hidden />
                                    </div>
                                    <h1 className="text-3xl font-bold text-base-content mb-2">
                                        Welcome to helpNINJA!
                                    </h1>
                                    <p className="text-base-content/60 text-lg">
                                        Let&apos;s set up your AI-powered customer support in just a few steps.
                                    </p>
                                </div>

                                <div className="max-w-2xl mx-auto space-y-6 card bg-base-100 rounded-xl p-6 mb-6">
                                    {/* Company Information */}
                                    <div className="space-y-4">
                                        <h2 className="text-xl font-semibold text-base-content">
                                            Tell us about your company
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">Company Name *</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Acme Corp"
                                                    className="input input-bordered"
                                                    value={formData.companyName}
                                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">Industry</span>
                                                </label>
                                                <select
                                                    className="select select-bordered"
                                                    value={formData.industry}
                                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                                >
                                                    <option value="">Select industry...</option>
                                                    <option value="technology">Technology</option>
                                                    <option value="ecommerce">E-commerce</option>
                                                    <option value="saas">SaaS</option>
                                                    <option value="healthcare">Healthcare</option>
                                                    <option value="finance">Finance</option>
                                                    <option value="education">Education</option>
                                                    <option value="consulting">Consulting</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">Team Size</span>
                                                </label>
                                                <select
                                                    className="select select-bordered"
                                                    value={formData.teamSize}
                                                    onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                                                >
                                                    <option value="">Select team size...</option>
                                                    <option value="1-10">1-10 people</option>
                                                    <option value="11-50">11-50 people</option>
                                                    <option value="51-200">51-200 people</option>
                                                    <option value="201-1000">201-1000 people</option>
                                                    <option value="1000+">1000+ people</option>
                                                </select>
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text">Primary Use Case</span>
                                                </label>
                                                <select
                                                    className="select select-bordered"
                                                    value={formData.useCase}
                                                    onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                                                >
                                                    <option value="">Select use case...</option>
                                                    <option value="customer-support">Customer Support</option>
                                                    <option value="lead-generation">Lead Generation</option>
                                                    <option value="documentation">Documentation Helper</option>
                                                    <option value="sales">Sales Assistant</option>
                                                    <option value="faq">FAQ Automation</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Status */}
                                    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/20 p-6">
                                        <h3 className="text-lg font-semibold text-base-content mb-4">
                                            Account Status
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="text-base-content/60">Plan</div>
                                                <div className="font-semibold">
                                                    Starter Plan
                                                    <span className="badge badge-success ml-2">Active</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-base-content/60">Monthly Messages</div>
                                                <div className="font-semibold">0 / 100 used</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* What's Next */}
                                    <div className="bg-gradient-to-br from-info/10 to-info/5 rounded-2xl border border-info/20 p-6 flex items-start gap-4">
                                        <div className="w-10 h-10 bg-info/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <i className="fa-duotone fa-solid fa-lightbulb text-info" aria-hidden />
                                        </div>
                                        <div>
                                            <h3 className="font-bold">What&apos;s next?</h3>
                                            <div className="text-sm">
                                                After this setup, you&apos;ll register your website domains and get your widget installation code.
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
                            currentStep={1}
                            totalSteps={3}
                            nextLabel="Continue to Website Setup"
                            nextDisabled={!formData.companyName.trim()}
                            onNext={handleNext}
                            isLoading={saving}
                            showSkip={true}
                        />
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}
