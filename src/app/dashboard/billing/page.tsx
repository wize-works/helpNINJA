'use client';
import { useState, Suspense } from 'react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from '@/components/ui/animated-page';
import { toastUtils } from '@/lib/toast';
import { PLAN_DETAILS } from '@/lib/plan';
import { Plan } from '@/lib/limits';

type BillingPeriod = 'monthly' | 'yearly';

export default function BillingPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Billing", icon: "fa-credit-card" }
    ];

    async function checkout(plan: string) {
        setLoading(plan);
        const r = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan, billingPeriod }) });
        const j = await r.json();
        setLoading(null);
        if (j.url) window.location.href = j.url; else toastUtils.error(j.error || 'Error creating checkout');
    }

    async function portal() {
        const r = await fetch('/api/billing/portal', { method: 'POST', headers: { 'content-type': 'application/json' } });
        const j = await r.json();
        if (j.url) window.location.href = j.url; else toastUtils.error(j.error || 'Error accessing billing portal');
    }

    return (
        <Suspense fallback={null}>
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
                                    <HoverScale scale={1.02}>
                                        <button onClick={portal} className="btn btn-outline rounded-lg btn-sm">
                                            <i className="fa-duotone fa-solid fa-gear mr-2" aria-hidden />
                                            Manage Subscription
                                        </button>
                                    </HoverScale>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>

                    {/* Billing Period Toggle */}
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="flex justify-center">
                                <div className="join">
                                    <button
                                        className={`btn join-item ${billingPeriod === 'monthly' ? 'btn-active' : ''}`}
                                        onClick={() => setBillingPeriod('monthly')}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        className={`btn join-item ${billingPeriod === 'yearly' ? 'btn-active' : ''}`}
                                        onClick={() => setBillingPeriod('yearly')}
                                    >
                                        Yearly
                                        <span className="badge badge-accent badge-sm ml-1">Save up to 20%</span>
                                    </button>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>

                    {/* Plans Grid */}
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(Object.keys(PLAN_DETAILS) as Plan[]).filter(plan => plan !== 'none').map((plan, index) => {
                                    const details = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS];
                                    const pricing = details[billingPeriod];

                                    return (
                                        <div key={plan} className={`card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group relative ${details.popular ? 'border-2 border-primary' : ''}`}>
                                            {details.popular && (
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                                    <div className="badge badge-accent">Most Popular</div>
                                                </div>
                                            )}
                                            <div className="p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                                                        <i className={`fa-duotone fa-solid ${index === 0 ? 'fa-seedling' : index === 1 ? 'fa-rocket' : 'fa-building'} text-lg text-primary`} aria-hidden />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-base-content">{details.name}</h3>
                                                        <div className="text-3xl font-bold text-primary">{pricing.price}</div>
                                                        <div className="text-sm text-base-content/60">/{pricing.period}</div>
                                                        {billingPeriod === 'yearly' && 'savings' in pricing && (
                                                            <div className="text-xs text-success mt-1">{pricing.savings}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-sm text-base-content/60 mb-4">{details.description}</p>

                                                <ul className="space-y-2 mb-6">
                                                    {details.features.map((feature, featureIndex) => (
                                                        <li key={featureIndex} className="flex items-center gap-2 text-sm text-base-content/70">
                                                            <i className="fa-duotone fa-solid fa-check text-success text-xs" aria-hidden />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>

                                                <HoverScale scale={1.02}>
                                                    <button
                                                        onClick={() => checkout(plan)}
                                                        disabled={loading === plan}
                                                        className={`btn w-full rounded-xl mt-auto ${details.color} ${loading === plan ? 'loading' : ''}`}
                                                    >
                                                        {loading === plan ? (
                                                            <>
                                                                <span className="loading loading-spinner loading-sm"></span>
                                                                Processing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fa-duotone fa-solid fa-credit-card mr-2" aria-hidden />
                                                                Choose {details.name}
                                                            </>
                                                        )}
                                                    </button>
                                                </HoverScale>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                            <button onClick={portal} className="btn btn-primary rounded-xl">
                                                <i className="fa-duotone fa-solid fa-external-link mr-2" aria-hidden />
                                                Customer Portal
                                            </button>
                                        </HoverScale>
                                        <HoverScale scale={1.02}>
                                            <a href="/dashboard/billing/history" className="btn btn-outline rounded-xl">
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
        </Suspense>
    );
}