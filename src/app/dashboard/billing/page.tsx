'use client';
import { useState } from 'react';
import { useTenant } from '@/components/tenant-context';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from '@/components/ui/animated-page';
import { toastUtils } from '@/lib/toast';

const PLANS = [
    { key: 'starter', name: 'Starter', price: '$29/mo', features: ['1 site', '1k messages', 'Email handoff'] },
    { key: 'pro', name: 'Pro', price: '$79/mo', features: ['3 sites', '5k messages', 'Slack handoff', 'Analytics'] },
    { key: 'agency', name: 'Agency', price: '$249/mo', features: ['10 sites', '20k messages', 'White-label', 'Multi-client'] },
] as const;

export default function BillingPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const { tenantId } = useTenant();

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Billing", icon: "fa-credit-card" }
    ];

    async function checkout(plan: string) {
        setLoading(plan);
        const r = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId || '' }, body: JSON.stringify({ plan }) });
        const j = await r.json();
        setLoading(null);
        if (j.url) window.location.href = j.url; else toastUtils.error(j.error || 'Error creating checkout');
    }

    async function portal() {
        const r = await fetch('/api/billing/portal', { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId || '' } });
        const j = await r.json();
        if (j.url) window.location.href = j.url; else toastUtils.error(j.error || 'Error accessing billing portal');
    }

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Breadcrumb */}
                <StaggerContainer>
                    <StaggerChild>
                        <Breadcrumb items={breadcrumbItems} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Header */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-base-content">Billing & Plans</h1>
                                <p className="text-base-content/60 mt-2">
                                    Manage your subscription, view usage, and upgrade your plan to unlock more features
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="stats shadow">
                                    <div className="stat">
                                        <div className="stat-figure text-success">
                                            <i className="fa-duotone fa-solid fa-credit-card text-2xl" aria-hidden />
                                        </div>
                                        <div className="stat-title">Current Plan</div>
                                        <div className="stat-value text-success text-lg">Active</div>
                                        <div className="stat-desc">Billing up to date</div>
                                    </div>
                                </div>
                                <HoverScale scale={1.02}>
                                    <button onClick={portal} className="btn btn-outline btn-sm">
                                        <i className="fa-duotone fa-solid fa-gear mr-2" aria-hidden />
                                        Manage Subscription
                                    </button>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Plans Grid */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {PLANS.map((plan, index) => (
                                <div key={plan.key} className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
                                    <div className="p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                                                <i className={`fa-duotone fa-solid ${index === 0 ? 'fa-seedling' : index === 1 ? 'fa-rocket' : 'fa-building'} text-lg text-primary`} aria-hidden />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-base-content">{plan.name}</h3>
                                                <div className="text-3xl font-bold text-primary">{plan.price}</div>
                                            </div>
                                        </div>

                                        <ul className="space-y-2 mb-6">
                                            {plan.features.map(feature => (
                                                <li key={feature} className="flex items-center gap-2 text-sm text-base-content/70">
                                                    <i className="fa-duotone fa-solid fa-check text-success text-xs" aria-hidden />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <HoverScale scale={1.02}>
                                            <button
                                                onClick={() => checkout(plan.key)}
                                                disabled={loading === plan.key}
                                                className={`btn w-full ${index === 1 ? 'btn-primary' : 'btn-outline'} ${loading === plan.key ? 'loading' : ''}`}
                                            >
                                                {loading === plan.key ? (
                                                    <>
                                                        <span className="loading loading-spinner loading-sm"></span>
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa-duotone fa-solid fa-credit-card mr-2" aria-hidden />
                                                        Choose {plan.name}
                                                    </>
                                                )}
                                            </button>
                                        </HoverScale>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Current Plan Info */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-info/10 rounded-2xl flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-info text-lg text-info" aria-hidden />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-base-content">Billing Information</h3>
                                        <p className="text-base-content/60 text-sm">Manage your payment methods and billing history</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="text-center p-4 bg-base-200/20 rounded-xl">
                                        <div className="text-2xl font-bold text-base-content">$79</div>
                                        <div className="text-sm text-base-content/60">Next billing</div>
                                    </div>
                                    <div className="text-center p-4 bg-base-200/20 rounded-xl">
                                        <div className="text-2xl font-bold text-base-content">Dec 28</div>
                                        <div className="text-sm text-base-content/60">Billing date</div>
                                    </div>
                                    <div className="text-center p-4 bg-base-200/20 rounded-xl">
                                        <div className="text-2xl font-bold text-base-content">Pro</div>
                                        <div className="text-sm text-base-content/60">Current plan</div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <HoverScale scale={1.02}>
                                        <button onClick={portal} className="btn btn-primary">
                                            <i className="fa-duotone fa-solid fa-external-link mr-2" aria-hidden />
                                            Customer Portal
                                        </button>
                                    </HoverScale>
                                    <HoverScale scale={1.02}>
                                        <a href="/dashboard/billing/history" className="btn btn-outline">
                                            <i className="fa-duotone fa-solid fa-receipt mr-2" aria-hidden />
                                            Billing History
                                        </a>
                                    </HoverScale>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}