"use client";

import { Suspense, useEffect, useState } from "react";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { useUser, useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import PlanSelection from "@/components/plan-selection";
import StripeCheckout from "@/components/stripe-checkout";
import { type Plan } from "@/lib/limits";

export default function SignUpPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isSignedIn } = useUser();
    const { organization, isLoaded: orgLoaded } = useOrganization();
    const { createOrganization, setActive, isLoaded: orgListLoaded } = useOrganizationList();
    const [orgName, setOrgName] = useState("");
    const [creating, setCreating] = useState(false);
    const [orgError, setOrgError] = useState<string | null>(null);
    const [step, setStep] = useState<'org' | 'plan' | 'payment'>('org'); // Track current step
    const [planSelecting, setPlanSelecting] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);
    const [selectedPlanData, setSelectedPlanData] = useState<{ plan: Plan; billingPeriod: 'monthly' | 'yearly' } | null>(null);
    const [planCompleted, setPlanCompleted] = useState(false); // Track if plan selection is completed

    // Check for payment success/cancel in URL params
    useEffect(() => {
        const paymentSuccess = searchParams.get('payment_success');
        const paymentCanceled = searchParams.get('payment_canceled');

        if (paymentSuccess === '1') {
            // Payment succeeded, mark as completed
            setPlanCompleted(true);
            // Clean up URL
            const url = new URL(window.location.href);
            url.searchParams.delete('payment_success');
            url.searchParams.delete('session_id');
            window.history.replaceState({}, '', url.toString());
        } else if (paymentCanceled === '1') {
            // Payment was canceled, go back to payment step
            setStep('payment');
            // Clean up URL
            const url = new URL(window.location.href);
            url.searchParams.delete('payment_canceled');
            window.history.replaceState({}, '', url.toString());
        }
    }, [searchParams]);

    useEffect(() => {
        // Only redirect to onboarding if user has organization AND has completed payment
        if (isSignedIn && orgLoaded && organization && planCompleted) {
            router.replace("/onboarding/step-1");
        }
        // If user has organization but we're still on org step, they just created org and need plan selection
        else if (isSignedIn && orgLoaded && organization && step === 'org') {
            setStep('plan');
        }
    }, [isSignedIn, orgLoaded, organization, planCompleted, step, router]);

    async function handleSelectPlan(plan: Plan, billingPeriod: 'monthly' | 'yearly') {
        setPlanSelecting(true);
        setPlanError(null);
        try {
            const response = await fetch('/api/signup/select-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ plan, billingPeriod }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to select plan');
            }

            // Store the selected plan data and move to payment step
            setSelectedPlanData({ plan, billingPeriod });
            setStep('payment');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to select plan';
            setPlanError(msg);
        } finally {
            setPlanSelecting(false);
        }
    }

    // Handle payment completion
    const handlePaymentComplete = () => {
        setPlanCompleted(true);
    };

    async function handleCreateOrg(e: React.FormEvent) {
        e.preventDefault();
        if (!orgListLoaded || creating) return;
        setCreating(true);
        setOrgError(null);
        try {
            // Let Clerk auto-generate the slug from the name
            const org = await createOrganization?.({ name: orgName });
            if (org && setActive) {
                await setActive({ organization: org.id });
                // Move to plan selection step instead of directly to onboarding
                setStep('plan');
            }
        } catch (err: unknown) {
            const anyErr = err as { errors?: Array<{ message?: string }>; message?: string } | undefined;
            const msg = anyErr?.errors?.[0]?.message || anyErr?.message || "Failed to create workspace";
            setOrgError(msg);
        } finally {
            setCreating(false);
        }
    }

    return (
        <Suspense fallback={null}>
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className={`w-full ${step === 'plan' ? 'max-w-6xl' : step === 'payment' ? 'max-w-2xl' : 'max-w-md'}`}>

                    {!isSignedIn && (
                        <SignUp.Root>
                            <SignUp.Step name="start" className="space-y-4">
                                <div className="card bg-base-100 shadow-xl rounded-2xl p-6">
                                    <h1 className="text-2xl font-bold mb-1">Create your account</h1>
                                    <p className="text-base-content/60 mb-6">Fast with Google or Microsoft. Email works too.</p>
                                    <Clerk.GlobalError />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Clerk.Field name="firstName" className="fieldset">
                                            <Clerk.Label>First Name</Clerk.Label>
                                            <Clerk.Input type="text" className="input w-full" placeholder="Hattori" />
                                            <Clerk.FieldError />
                                        </Clerk.Field>

                                        <Clerk.Field name="lastName" className="fieldset">
                                            <Clerk.Label>Last Name</Clerk.Label>
                                            <Clerk.Input type="text" className="input w-full" placeholder="Hanzō" />
                                            <Clerk.FieldError />
                                        </Clerk.Field>
                                    </div>

                                    <Clerk.Field name="emailAddress" className="fieldset">
                                        <Clerk.Label>What is your email?</Clerk.Label>
                                        <Clerk.Input type="email" className="input w-full" placeholder="you@helpninja.com" />
                                        <Clerk.FieldError />
                                    </Clerk.Field>

                                    <Clerk.Field name="password" className="fieldset">
                                        <Clerk.Label>What do you want your password to be?</Clerk.Label>
                                        <Clerk.Input type="password" className="input w-full" placeholder="••••••••" />
                                        <Clerk.FieldError />
                                    </Clerk.Field>

                                    <SignUp.Action submit className="btn btn-primary w-full">Create Account</SignUp.Action>

                                    <div className="divider">or</div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <Clerk.Connection name="google" className="btn btn-outline"><Clerk.Icon />Google</Clerk.Connection>
                                        <Clerk.Connection name="facebook" className="btn btn-outline"><Clerk.Icon />Facebook</Clerk.Connection>
                                        <Clerk.Connection name="microsoft" className="btn btn-outline"><Clerk.Icon />Microsoft</Clerk.Connection>
                                    </div>

                                    <SignUp.Captcha className="w-full" />

                                    <div className="text-sm text-base-content/60 text-center">
                                        Already have an account? <a className="link link-primary" href="/auth/signin">Sign in</a>
                                    </div>
                                </div>
                            </SignUp.Step>

                            <SignUp.Step name="verifications" className="space-y-4">
                                <div className="card bg-base-100 shadow-xl rounded-2xl p-6">
                                    <h1 className="text-2xl font-bold mb-1">Verify your account</h1>
                                    <p className="text-base-content/60 mb-6">Check your email for the confirmation code</p>
                                    <Clerk.GlobalError />
                                    <SignUp.Strategy name="email_code">
                                        <Clerk.Field name="code" className="fieldset">
                                            <Clerk.Label>Enter the code sent to your email</Clerk.Label>
                                            <Clerk.Input inputMode="numeric" className="input input-bordered w-full" placeholder="123456" />
                                            <Clerk.FieldError />
                                        </Clerk.Field>

                                        <SignUp.Action submit className="btn btn-primary w-full">Verify</SignUp.Action>
                                    </SignUp.Strategy>
                                </div>
                            </SignUp.Step>
                        </SignUp.Root>
                    )}

                    {isSignedIn && orgLoaded && !organization && step === 'org' && (
                        <div className="mt-6">
                            <div className="card bg-base-100 shadow-xl rounded-2xl p-6">
                                <h1 className="text-2xl font-bold mb-1">Setup your organization</h1>
                                <p className="text-base-content/60 mb-6">Fast with Google or Microsoft. Email works too.</p>
                                <div className="divider">
                                    <span>Create your workspace</span>
                                </div>
                                <form onSubmit={handleCreateOrg} className="space-y-4">
                                    {orgError && (
                                        <div className="alert alert-error text-sm">{orgError}</div>
                                    )}
                                    <div className="fieldset">
                                        <label className="label" htmlFor="org-name">Workspace name</label>
                                        <input
                                            id="org-name"
                                            className="input w-full"
                                            placeholder="Acme Inc."
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            required
                                        />
                                        <div className="text-xs text-base-content/60">We&apos;ll create a unique workspace URL for you.</div>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-full" disabled={creating || !orgListLoaded}>
                                        {creating ? "Creating..." : "Create workspace"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                    }

                    {
                        isSignedIn && orgLoaded && organization && step === 'plan' && (
                            <div className="mt-6">
                                <PlanSelection
                                    onSelectPlan={handleSelectPlan}
                                    loading={planSelecting}
                                    error={planError}
                                />
                            </div>
                        )
                    }

                    {
                        isSignedIn && orgLoaded && organization && step === 'payment' && selectedPlanData && (
                            <div className="mt-6">
                                <StripeCheckout
                                    plan={selectedPlanData.plan}
                                    billingPeriod={selectedPlanData.billingPeriod}
                                    onComplete={handlePaymentComplete}
                                    onError={(error) => {
                                        console.error('Payment error:', error);
                                        // Could add error handling here
                                    }}
                                />
                            </div>
                        )
                    }
                </div >
            </div >
        </Suspense >
    );
}
