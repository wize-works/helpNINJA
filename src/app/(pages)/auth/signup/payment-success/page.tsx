"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function PaymentSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isSignedIn } = useUser();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isSignedIn) {
            router.replace('/auth/signin');
            return;
        }

        const sessionId = searchParams.get('session_id');
        if (!sessionId) {
            setError('Invalid session');
            setLoading(false);
            return;
        }

        // Verify the payment and redirect to onboarding
        const verifyPayment = async (sessionId: string) => {
            try {
                const response = await fetch('/api/signup/verify-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sessionId }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Payment verification failed');
                }

                // Payment successful, redirect to onboarding
                router.replace('/onboarding/step-1');
            } catch (err) {
                console.error('Payment verification error:', err);
                setError(err instanceof Error ? err.message : 'Payment verification failed');
                setLoading(false);
            }
        };

        verifyPayment(sessionId);
    }, [isSignedIn, searchParams, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="loading loading-spinner loading-lg"></div>
                    <h1 className="text-2xl font-bold">Completing your signup...</h1>
                    <p className="text-base-content/60">Please wait while we verify your payment.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center space-y-4 max-w-md">
                    <div className="text-error text-6xl">⚠️</div>
                    <h1 className="text-2xl font-bold">Payment Verification Failed</h1>
                    <p className="text-base-content/60">{error}</p>
                    <div className="space-x-4">
                        <button
                            onClick={() => router.push('/auth/signup')}
                            className="btn btn-primary"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="btn btn-outline"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
