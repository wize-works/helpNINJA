"use client";

import { useState } from "react";
import { type Plan } from "@/lib/limits";

type BillingPeriod = 'monthly' | 'yearly';

type PlanSelectionProps = {
    onSelectPlan: (plan: Plan, billingPeriod: BillingPeriod) => Promise<void>;
    loading?: boolean;
    error?: string | null;
};

const PLAN_DETAILS = {
    starter: {
        name: "Starter",
        monthly: { price: "$29", period: "per month" },
        yearly: { price: "$290", period: "per year", savings: "Save $58" },
        description: "Perfect for freelancers or very small teams",
        features: [
            "1 website widget",
            "1,000 AI messages/month",
            "1 escalation destination (Slack or Email)",
            "Basic dashboard analytics",
            "Community support"
        ],
        popular: false,
        color: "btn-outline",
    },
    pro: {
        name: "Pro",
        monthly: { price: "$99", period: "per month" },
        yearly: { price: "$990", period: "per year", savings: "Save $198" },
        description: "Great for growing businesses",
        features: [
            "Up to 3 website widgets",
            "10,000 AI messages/month",
            "Multiple escalation destinations (Slack + Email + more)",
            "Advanced analytics (low-confidence, deflection, CSAT)",
            "Priority email support",
            "API access (test queries, custom integrations)"
        ],
        popular: true,
        color: "btn-primary",
    },
    agency: {
        name: "Agency",
        monthly: { price: "$299", period: "per month" },
        yearly: { price: "$2990", period: "per year", savings: "Save $598" },
        description: "For agencies and larger organizations",
        features: [
            "Unlimited website widgets",
            "50,000 AI messages/month",
            "Unlimited escalation rules & destinations",
            "White-label widget (branding removed)",
            "Team seats & role management",
            "SLA + premium support"
        ],
        popular: false,
        color: "btn-secondary",
    }
} as const;

export default function PlanSelection({ onSelectPlan, loading = false, error }: PlanSelectionProps) {
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

    const handleSelectPlan = async (plan: Plan) => {
        setSelectedPlan(plan);
        try {
            await onSelectPlan(plan, billingPeriod);
        } catch {
            // Error handling is done by parent component
            setSelectedPlan(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Choose your plan</h2>
                <p className="text-base-content/60">Start with any plan and upgrade anytime</p>

                {/* Billing Period Toggle */}
                <div className="flex justify-center mt-6">
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
            </div>

            {error && (
                <div className="alert alert-error text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.keys(PLAN_DETAILS) as Plan[]).filter(plan => plan !== 'none').map((plan) => {
                    const details = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS];
                    const pricing = details[billingPeriod];
                    const isLoading = loading && selectedPlan === plan;

                    return (
                        <div
                            key={plan}
                            className={`card bg-base-100 shadow-xl rounded-2xl border-2 ${details.popular ? 'border-primary' : 'border-base-300'
                                } relative`}
                        >
                            {details.popular && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <div className="badge badge-accent">Most Popular</div>
                                </div>
                            )}

                            <div className="card-body p-6">
                                <div className="text-center">
                                    <h3 className="text-xl font-bold">{details.name}</h3>
                                    <div className="mt-2">
                                        <span className="text-3xl font-bold">{pricing.price}</span>
                                        <span className="text-base-content/60 text-sm">/{pricing.period}</span>
                                        {billingPeriod === 'yearly' && 'savings' in pricing && (
                                            <div className="text-xs text-success mt-1">{pricing.savings}</div>
                                        )}
                                    </div>
                                    <p className="text-sm text-base-content/60 mt-2">{details.description}</p>
                                </div>

                                <div className="divider my-4"></div>

                                <ul className="space-y-4 text-sm">
                                    {details.features.map((feature, index) => (
                                        <li key={index} className="flex items-center gap-4">
                                            <svg className="w-4 h-4 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <div className="card-actions justify-end mt-auto pt-12">
                                    <button
                                        onClick={() => handleSelectPlan(plan)}
                                        disabled={loading}
                                        className={`btn w-full rounded-xl ${details.color} ${isLoading ? 'loading' : ''}`}
                                    >
                                        {isLoading ? 'Selecting...' : `Choose ${details.name}`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="text-center">
                <p className="text-sm text-base-content/60">
                    All plans include a 14-day free trial.
                </p>
                <p className="text-xs text-base-content/40 mt-2">
                    <button
                        onClick={() => onSelectPlan('starter', billingPeriod)}
                        className="link link-hover"
                    >
                        Skip and start with Starter plan
                    </button>
                </p>
            </div>
        </div>
    );
}
