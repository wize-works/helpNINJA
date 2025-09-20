"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type OnboardingNavigationProps = {
    currentStep: number;
    totalSteps: number;
    nextHref?: string;
    prevHref?: string;
    nextLabel?: string;
    prevLabel?: string;
    nextDisabled?: boolean;
    onNext?: () => void | Promise<void>;
    onPrev?: () => void;
    showSkip?: boolean;
    skipHref?: string;
    isLoading?: boolean;
    className?: string;
};

export default function OnboardingNavigation({
    currentStep,
    totalSteps,
    nextHref,
    prevHref,
    nextLabel = "Continue",
    prevLabel = "Back",
    nextDisabled = false,
    onNext,
    onPrev,
    showSkip = false,
    skipHref = "/dashboard",
    isLoading = false,
    className = ""
}: OnboardingNavigationProps) {
    const router = useRouter();
    const isFirstStep = currentStep === 1;
    const isLastStep = currentStep === totalSteps;

    async function handleNext() {
        if (onNext) {
            await onNext();
        } else if (nextHref) {
            router.push(nextHref);
        }
    }

    function handlePrev() {
        if (onPrev) {
            onPrev();
        } else if (prevHref) {
            router.push(prevHref);
        }
    }

    return (
        <div className={`flex items-center justify-between gap-4 ${className}`}>
            {/* Left Side - Back Button */}
            <div className="flex-1">
                {!isFirstStep && (
                    <button
                        onClick={handlePrev}
                        className="btn  rounded-xl"
                        disabled={isLoading}
                    >
                        <i className="fa-duotone fa-solid fa-arrow-left mr-2" aria-hidden />
                        {prevLabel}
                    </button>
                )}
            </div>

            {/* Center - Skip Option */}
            <div className="flex-shrink-0">
                {showSkip && (
                    <Link href={skipHref} className="btn  btn-sm rounded-lg">
                        Skip setup
                    </Link>
                )}
            </div>

            {/* Right Side - Next/Finish Button */}
            <div className="flex-1 flex justify-end gap-3">
                {isLastStep ? (
                    <button
                        onClick={handleNext}
                        className={`btn btn-primary rounded-xl ${isLoading ? 'loading' : ''}`}
                        disabled={nextDisabled || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Finishing...
                            </>
                        ) : (
                            <>
                                <i className="fa-duotone fa-solid fa-rocket mr-2" aria-hidden />
                                Complete Setup
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className={`btn btn-primary rounded-xl ${isLoading ? 'loading' : ''}`}
                        disabled={nextDisabled || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Processing...
                            </>
                        ) : (
                            <>
                                {nextLabel}
                                <i className="fa-duotone fa-solid fa-arrow-right ml-2" aria-hidden />
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

// Simplified version for forms
type SimpleNavigationProps = {
    onBack?: () => void;
    onNext?: () => void | Promise<void>;
    nextLabel?: string;
    nextDisabled?: boolean;
    isLoading?: boolean;
    showBack?: boolean;
};

export function SimpleOnboardingNavigation({
    onBack,
    onNext,
    nextLabel = "Continue",
    nextDisabled = false,
    isLoading = false,
    showBack = true
}: SimpleNavigationProps) {
    return (
        <div className="flex items-center justify-between gap-4 pt-6 border-t border-base-300">
            {showBack ? (
                <button
                    onClick={onBack}
                    className="btn  rounded-xl"
                    disabled={isLoading}
                >
                    <i className="fa-duotone fa-solid fa-arrow-left mr-2" aria-hidden />
                    Back
                </button>
            ) : (
                <div />
            )}

            <button
                onClick={onNext}
                className={`btn btn-primary rounded-xl ${isLoading ? 'loading' : ''}`}
                disabled={nextDisabled || isLoading}
            >
                {isLoading ? (
                    <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Processing...
                    </>
                ) : (
                    <>
                        {nextLabel}
                        <i className="fa-duotone fa-solid fa-arrow-right ml-2" aria-hidden />
                    </>
                )}
            </button>
        </div>
    );
}
