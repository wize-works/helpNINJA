'use client';

import { useState } from 'react';
import { HoverScale } from '@/components/ui/animated-page';
import EscalationChoiceModal from '@/components/escalation-choice-modal';

interface ManualEscalationButtonProps {
    conversationId: string;
    sessionId?: string;
    userMessage?: string;
    disabled?: boolean;
}

export default function ManualEscalationButton({
    conversationId,
    sessionId,
    userMessage,
    disabled = false
}: ManualEscalationButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEscalation = async (selectedIntegrations: string[], reason: string, message?: string) => {
        setError(null);

        try {
            // If no integrations selected, use the old API that sends to all
            if (selectedIntegrations.length === 0) {
                throw new Error('Please select at least one integration');
            }

            // For now, we'll still use the existing API but this is where we'll later
            // modify to support specific integration targeting
            const response = await fetch('/api/escalate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId,
                    sessionId,
                    userMessage: message || userMessage || 'Manual escalation requested by agent',
                    reason: reason || 'manual',
                    fromChat: false,
                    skipWebhooks: false,
                    selectedIntegrations
                })
            });

            const data = await response.json();

            if (response.ok && data.ok) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                throw new Error(data.error || 'Failed to escalate conversation');
            }
        } catch (err) {
            console.error('Manual escalation error:', err);
            setError((err as Error).message || 'Failed to escalate conversation. Please try again.');
            throw err; // Re-throw to let modal handle the error state
        }
    };

    return (
        <>
            <div className="space-y-2">
                <HoverScale scale={1.02}>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={disabled || success}
                        className={`btn btn-secondary btn-block rounded-xl justify-start ${success ? 'btn-success' : ''
                            }`}
                    >
                        {success ? (
                            <>
                                <i className="fa-duotone fa-solid fa-check text-xs" />
                                Escalated Successfully
                            </>
                        ) : (
                            <>
                                <i className="fa-duotone fa-solid fa-fire text-xs" />
                                Manual Escalation
                            </>
                        )}
                    </button>
                </HoverScale>

                {error && (
                    <div className="text-xs text-error px-2">
                        <i className="fa-duotone fa-solid fa-triangle-exclamation mr-1" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="text-xs text-success px-2">
                        <i className="fa-duotone fa-solid fa-check mr-1" />
                        Conversation has been escalated to your selected support channels.
                    </div>
                )}
            </div>

            <EscalationChoiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onEscalate={handleEscalation}
                sessionId={sessionId}
                userMessage={userMessage}
            />
        </>
    );
}
