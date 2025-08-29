"use client";

import { useState, useEffect } from 'react';
import FeedbackForm, { type FeedbackFormData } from './feedback-form';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId?: string;
    conversationId?: string;
    sessionId?: string;
    initialData?: Partial<FeedbackFormData>;
    mode?: 'widget' | 'dashboard';
    className?: string;
}

export default function FeedbackModal({
    isOpen,
    onClose,
    tenantId,
    conversationId,
    sessionId,
    initialData,
    mode = 'widget',
    className = ''
}: FeedbackModalProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            // Add a small delay for close animation
            const timeout = setTimeout(() => setIsAnimating(false), 150);
            document.body.style.overflow = '';
            return () => clearTimeout(timeout);
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleSuccess = (feedbackId: string) => {
        console.log('Feedback submitted successfully:', feedbackId);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen && !isAnimating) {
        return null;
    }

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
                mode === 'widget' ? 'font-sans' : ''
            } ${className}`}
            style={{ 
                backgroundColor: mode === 'widget' ? 'rgba(0, 0, 0, 0.5)' : undefined,
                backdropFilter: mode === 'widget' ? 'blur(4px)' : undefined
            }}
            onKeyDown={handleKeyDown}
            onClick={handleBackdropClick}
            tabIndex={-1}
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ 
                    backgroundColor: mode === 'dashboard' ? 'rgba(0, 0, 0, 0.5)' : 'transparent'
                }}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full max-w-2xl max-h-[90vh] bg-base-100 rounded-2xl shadow-2xl transform transition-all duration-300 ${
                    isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
                }`}
                style={{
                    boxShadow: mode === 'widget' 
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
                        : undefined
                }}
            >
                {/* Header */}
                <div className="sticky top-0 bg-base-100 border-b border-base-300 rounded-t-2xl px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-comment-dots text-lg text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-base-content">Share Your Feedback</h2>
                            <p className="text-sm text-base-content/60">Help us improve your experience</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={onClose}
                        className="btn btn-ghost btn-sm btn-circle hover:bg-base-200 transition-colors"
                        aria-label="Close feedback modal"
                    >
                        <i className="fa-duotone fa-solid fa-times text-base-content/60" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">
                    <div className="p-6">
                        <FeedbackForm
                            mode={mode}
                            tenantId={tenantId}
                            conversationId={conversationId}
                            sessionId={sessionId}
                            initialData={initialData}
                            onSuccess={handleSuccess}
                            onCancel={onClose}
                        />
                    </div>
                </div>
            </div>

            {/* Custom scrollbar styles */}
            <style jsx>{`
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.5);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(156, 163, 175, 0.7);
                }
            `}</style>
        </div>
    );
}

// Hook for easier modal state management
export function useFeedbackModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [feedbackData, setFeedbackData] = useState<Partial<FeedbackFormData>>({});

    const openFeedback = (data?: Partial<FeedbackFormData>) => {
        if (data) {
            setFeedbackData(data);
        }
        setIsOpen(true);
    };

    const closeFeedback = () => {
        setIsOpen(false);
        // Clear data after animation completes
        setTimeout(() => setFeedbackData({}), 200);
    };

    return {
        isOpen,
        feedbackData,
        openFeedback,
        closeFeedback
    };
}
