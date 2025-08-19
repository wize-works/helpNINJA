"use client";

import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardNumberElement,
    CardExpiryElement,
    CardCvcElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { type Plan } from '@/lib/limits';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const elementOptions = {
    style: {
        base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': { color: '#aab7c4' },
        },
        invalid: { color: '#9e2146' },
    },
};

type StripeCheckoutProps = {
    plan: Plan;
    billingPeriod: 'monthly' | 'yearly';
    onComplete: () => void;
    onError?: (error: string) => void;
};

function CheckoutForm({ plan, billingPeriod, onComplete, onError }: StripeCheckoutProps) {
    const stripe = useStripe();
    const elements = useElements();

    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isSetupIntent, setIsSetupIntent] = useState(true);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cardholderName, setCardholderName] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [couponStatus, setCouponStatus] = useState<{ applied: boolean; discount?: number } | null>(null);
    const [hasFetched, setHasFetched] = useState(false);
    const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

    const createCheckout = useCallback(async (withCoupon?: string) => {
        // Prevent multiple concurrent calls that could create duplicate customers
        if (isCreatingCheckout) return null;

        try {
            setIsCreatingCheckout(true);
            setError(null);

            const res = await fetch('/api/signup/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan,
                    billingPeriod,
                    couponCode: withCoupon?.trim() || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');

            if (data.couponApplied) {
                setCouponStatus({ applied: true, discount: data.discountAmount });
            } else if (withCoupon?.trim()) {
                setCouponStatus({ applied: false });
            }

            setIsSetupIntent(true);
            return data.clientSecret as string;
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to initialize checkout';
            setError(msg);
            onError?.(msg);
            return null;
        } finally {
            setIsCreatingCheckout(false);
        }
    }, [plan, billingPeriod, isCreatingCheckout, onError]);

    const fetchClientSecret = useCallback(async () => {
        if (hasFetched) return null;

        setLoading(true);
        setHasFetched(true);

        try {
            const secret = await createCheckout(couponCode);
            return secret;
        } finally {
            setLoading(false);
        }
    }, [hasFetched, createCheckout, couponCode]);

    const applyCoupon = useCallback(async () => {
        if (!couponCode.trim() || isCreatingCheckout) return;

        setApplyingCoupon(true);
        try {
            const secret = await createCheckout(couponCode.trim());
            if (secret) {
                setClientSecret(secret);
            }
        } finally {
            setApplyingCoupon(false);
        }
    }, [couponCode, createCheckout, isCreatingCheckout]);

    useEffect(() => {
        fetchClientSecret().then((secret) => {
            if (secret) setClientSecret(secret);
        });
    }, [fetchClientSecret]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!stripe || !elements) return;
        if (!clientSecret) {
            setError('Payment not initialized');
            return;
        }

        const cardElement = elements.getElement(CardNumberElement);
        if (!cardElement) {
            setError('Card element not found');
            return;
        }

        setProcessing(true);
        setError(null);

        const result = await stripe.confirmCardSetup(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: { name: cardholderName || 'Customer' },
            },
        });

        if (result.error) {
            setError(result.error.message || 'Setup failed');
            setProcessing(false);
            return;
        }

        try {
            const res = await fetch('/api/signup/complete-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setupIntentId: result.setupIntent.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to complete subscription setup');

            onComplete();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to complete subscription setup';
            setError(msg);
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="loading loading-spinner loading-lg"></div>
                <p className="mt-4 text-base-content/60">Setting up your checkout…</p>
            </div>
        );
    }

    if (error && !clientSecret) {
        return (
            <div className="text-center py-12">
                <div className="alert alert-error max-w-md mx-auto">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
                <button
                    onClick={() => {
                        if (isCreatingCheckout) return;
                        setHasFetched(false);
                        fetchClientSecret().then((secret) => secret && setClientSecret(secret));
                    }}
                    className="btn btn-outline btn-sm rounded-lg mt-4"
                    disabled={isCreatingCheckout}
                >
                    {isCreatingCheckout ? 'Retrying...' : 'Try Again'}
                </button>
            </div>
        );
    }

    if (!clientSecret) {
        return (
            <div className="text-center py-12">
                <div className="alert alert-warning max-w-md mx-auto">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Unable to initialize payment. Please try again.</span>
                </div>
            </div>
        );
    }

    const getPlanInfo = () => {
        const planNames: Record<Exclude<Plan, 'none'>, string> = {
            starter: 'Starter',
            pro: 'Pro',
            agency: 'Agency',
        };
        const prices: Record<Exclude<Plan, 'none'>, { monthly: string; yearly: string }> = {
            starter: { monthly: '$29', yearly: '$290' },
            pro: { monthly: '$99', yearly: '$990' },
            agency: { monthly: '$299', yearly: '$2990' },
        };
        if (plan === 'none') throw new Error('Invalid plan for checkout');
        return { name: planNames[plan], price: prices[plan][billingPeriod], period: billingPeriod === 'monthly' ? 'per month' : 'per year' };
    };

    const planInfo = getPlanInfo();

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Complete your subscription</h2>
                <p className="text-base-content/60">
                    Enter your payment details to start your 14‑day trial for the {planInfo.name} plan.
                </p>
            </div>

            <div className="card bg-base-100 shadow-lg p-6 rounded-xl">
                <div className="card-body p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-lg">{planInfo.name} Plan</h3>
                            <p className="text-base-content/60 capitalize">{billingPeriod} billing</p>
                        </div>
                        <div className="text-right">
                            {couponStatus?.applied && couponStatus.discount ? (
                                <div>
                                    <div className="text-lg text-base-content/60 line-through">{planInfo.price}</div>
                                    <div className="text-2xl font-bold text-success">
                                        ${((parseFloat(planInfo.price.replace('$', '')) * 100 - couponStatus.discount) / 100).toFixed(0)}
                                    </div>
                                    <div className="text-xs text-success font-semibold">
                                        Save ${(couponStatus.discount / 100).toFixed(0)} {planInfo.period}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-2xl font-bold">{planInfo.price}</div>
                                    <div className="text-sm text-base-content/60">{planInfo.period}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                        {billingPeriod === 'yearly' && <div className="badge badge-accent">Save up to 20%</div>}
                        {couponStatus?.applied && <div className="badge badge-success">Promo Applied</div>}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="alert alert-error text-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">{error}</div>
                        </div>
                    )}

                    {/* Cardholder Name */}
                    <div className="form-control">
                        <label className="label"><span className="label-text">Cardholder Name</span></label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="John Doe"
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            disabled={processing}
                        />
                    </div>

                    {/* Card Number */}
                    <div className="form-control">
                        <label className="label"><span className="label-text">Card Number</span></label>
                        <div className="input input-bordered flex items-center w-full">
                            <CardNumberElement options={elementOptions} className="flex-1 py-1" />
                        </div>
                    </div>

                    {/* Expiry / CVC */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Expiry Date</span></label>
                            <div className="input input-bordered flex items-center">
                                <CardExpiryElement options={elementOptions} className="flex-1 py-1" />
                            </div>
                        </div>
                        <div className="form-control">
                            <label className="label"><span className="label-text">CVC</span></label>
                            <div className="input input-bordered flex items-center">
                                <CardCvcElement options={elementOptions} className="flex-1 py-1" />
                            </div>
                        </div>
                    </div>

                    {/* Promo code */}
                    <div className="form-control">
                        <label className="label"><span className="label-text">Promo Code (Optional)</span></label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="input input-bordered flex-1"
                                placeholder="ENTER-CODE"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                disabled={processing}
                            />
                            <button
                                type="button"
                                onClick={applyCoupon}
                                disabled={!couponCode.trim() || processing || applyingCoupon}
                                className="btn btn-outline btn-sm rounded-lg"
                            >
                                {applyingCoupon ? (<><span className="loading loading-spinner loading-xs"></span>Applying…</>) : 'Apply'}
                            </button>
                        </div>
                        <div className="label">
                            <span className="label-text-alt text-base-content/60">Discount applies to the subscription after your trial.</span>
                        </div>
                        {couponStatus && (
                            <div className={`text-sm mt-1 ${couponStatus.applied ? 'text-success' : 'text-error'}`}>
                                {couponStatus.applied ? (
                                    <>✓ Promo code applied{couponStatus.discount ? <span className="ml-1 font-semibold"> – ${(couponStatus.discount / 100).toFixed(0)} off</span> : null}</>
                                ) : '⚠️ Invalid promo code'}
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={!stripe || processing} className="btn btn-primary btn-lg w-full rounded-xl">
                        {processing ? (<><span className="loading loading-spinner loading-sm"></span>Processing…</>) : 'Start 14‑day Free Trial'}
                    </button>
                    <p className="text-xs text-base-content/40 text-center">Secure payment powered by Stripe • SSL encrypted</p>
                </form>
            </div>

            <div className="text-center">
                <div className="text-sm font-semibold text-base-content/60">
                    <p>✓ 14‑day free trial</p>
                    <p>✓ Cancel anytime</p>
                    <p>✓ No setup fees</p>
                    {couponStatus?.applied && isSetupIntent && <p className="badge badge-success font-semibold mt-2">✓ Discount applies after trial period</p>}
                </div>
            </div>
        </div>
    );
}

export default function StripeCheckout(props: StripeCheckoutProps) {
    return (
        <Elements stripe={stripePromise}>
            <CheckoutForm {...props} />
        </Elements>
    );
}
