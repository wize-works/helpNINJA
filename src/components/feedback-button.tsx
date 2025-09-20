"use client";

import { useState } from 'react';
import FeedbackModal, { useFeedbackModal } from './feedback-modal';
import type { FeedbackFormData } from './feedback-form';

interface FeedbackButtonProps {
    mode?: 'widget' | 'dashboard';
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'icon-only' | 'base';
    size?: 'sm' | 'md' | 'lg';
    tenantId?: string;
    conversationId?: string;
    sessionId?: string;
    initialData?: Partial<FeedbackFormData>;
    className?: string;
    children?: React.ReactNode;
    position?: 'inline' | 'floating';
    floatingPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    tooltip?: string;
    showText?: boolean;
}

export default function FeedbackButton({
    mode = 'widget',
    variant = 'primary',
    size = 'md',
    tenantId,
    conversationId,
    sessionId,
    initialData,
    className = '',
    children,
    position = 'inline',
    floatingPosition = 'bottom-right',
    tooltip = 'Share feedback',
    showText = true
}: FeedbackButtonProps) {
    const { isOpen, feedbackData, openFeedback, closeFeedback } = useFeedbackModal();
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = () => {
        openFeedback({
            tenantId,
            conversationId,
            sessionId,
            ...initialData
        });
    };

    const getButtonClasses = () => {
        const baseClasses = 'btn transition-all duration-200 hover:scale-105';

        const sizeClasses = {
            sm: 'btn-sm',
            md: '',
            lg: 'btn-lg'
        };

        const variantClasses = {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
            ghost: 'btn-ghost',
            outline: 'btn-outline',
            base: '',
            'icon-only': 'btn-ghost btn-circle'
        };

        const positionClasses = position === 'floating' ? getFloatingClasses() : '';

        return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${positionClasses} ${className}`;
    };

    const getFloatingClasses = () => {
        const baseFloating = 'fixed z-40 shadow-lg';

        const positionClasses = {
            'bottom-right': 'bottom-4 right-4',
            'bottom-left': 'bottom-4 left-4',
            'top-right': 'top-4 right-4',
            'top-left': 'top-4 left-4'
        };

        return `${baseFloating} ${positionClasses[floatingPosition]}`;
    };

    const renderButtonContent = () => {
        if (children) {
            return children;
        }

        const icon = <i className="fa-duotone fa-solid fa-comment-dots" />;

        if (variant === 'icon-only') {
            return icon;
        }

        if (!showText) {
            return icon;
        }

        return (
            <>
                {icon}
                <span>Feedback</span>
            </>
        );
    };

    const buttonElement = (
        <button
            onClick={handleClick}
            className={getButtonClasses()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label={tooltip}
            title={variant === 'icon-only' ? tooltip : undefined}
        >
            {renderButtonContent()}
        </button>
    );

    return (
        <>
            {/* Floating button with optional tooltip */}
            {position === 'floating' && tooltip && variant === 'icon-only' ? (
                <div className="relative">
                    {buttonElement}

                    {/* Tooltip for floating icon button */}
                    {isHovered && (
                        <div
                            className={`absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-100 transition-opacity duration-300 whitespace-nowrap ${floatingPosition.includes('right') ? 'right-full mr-3' : 'left-full ml-3'
                                } ${floatingPosition.includes('bottom') ? 'bottom-0' : 'top-0'
                                }`}
                        >
                            {tooltip}

                            {/* Tooltip arrow */}
                            <div
                                className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${floatingPosition.includes('right') ? 'right-[-4px]' : 'left-[-4px]'
                                    } ${floatingPosition.includes('bottom') ? 'bottom-3' : 'top-3'
                                    }`}
                            />
                        </div>
                    )}
                </div>
            ) : (
                buttonElement
            )}

            {/* Feedback Modal */}
            <FeedbackModal
                isOpen={isOpen}
                onClose={closeFeedback}
                tenantId={tenantId}
                conversationId={conversationId}
                sessionId={sessionId}
                initialData={feedbackData}
                mode={mode}
            />
        </>
    );
}

// Specialized components for common use cases

export function WidgetFeedbackButton({
    tenantId,
    conversationId,
    sessionId,
    className = ''
}: {
    tenantId?: string;
    conversationId?: string;
    sessionId?: string;
    className?: string;
}) {
    return (
        <FeedbackButton
            mode="widget"
            variant="ghost"
            size="sm"
            tenantId={tenantId}
            conversationId={conversationId}
            sessionId={sessionId}
            className={`text-base-content/60 hover:text-base-content hover:bg-base-200 ${className}`}
            showText={false}
            tooltip="Send feedback"
        />
    );
}

export function FloatingFeedbackButton({
    tenantId,
    conversationId,
    sessionId,
    position = 'bottom-right'
}: {
    tenantId?: string;
    conversationId?: string;
    sessionId?: string;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}) {
    return (
        <FeedbackButton
            mode="widget"
            variant="primary"
            size="lg"
            position="floating"
            floatingPosition={position}
            tenantId={tenantId}
            conversationId={conversationId}
            sessionId={sessionId}
            showText={false}
            tooltip="Share your feedback"
            className="shadow-2xl hover:shadow-3xl"
        />
    );
}

export function DashboardFeedbackButton({
    tenantId,
    className = '',
    variant = 'outline'
}: {
    tenantId?: string;
    className?: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'base';
}) {
    return (
        <FeedbackButton
            mode="dashboard"
            variant={variant}
            size="md"
            tenantId={tenantId}
            className={className}
            initialData={{
                type: 'improvement',
                category: 'dashboard'
            }}
        />
    );
}

// Hook for programmatic feedback triggering
export function useFeedbackTrigger() {
    const { openFeedback } = useFeedbackModal();

    const triggerFeedback = (data: {
        type?: FeedbackFormData['type'];
        title?: string;
        description?: string;
        conversationId?: string;
        sessionId?: string;
        tenantId?: string;
        [key: string]: unknown;
    }) => {
        openFeedback(data);
    };

    const triggerBugReport = (data: {
        title?: string;
        description?: string;
        stepsToReproduce?: string;
        conversationId?: string;
        sessionId?: string;
        tenantId?: string;
    }) => {
        triggerFeedback({
            type: 'bug',
            priority: 'high',
            ...data
        });
    };

    const triggerFeatureRequest = (data: {
        title?: string;
        description?: string;
        conversationId?: string;
        sessionId?: string;
        tenantId?: string;
    }) => {
        triggerFeedback({
            type: 'feature_request',
            priority: 'medium',
            ...data
        });
    };

    return {
        triggerFeedback,
        triggerBugReport,
        triggerFeatureRequest
    };
}
