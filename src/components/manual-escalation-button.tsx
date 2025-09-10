'use client';

import { useState } from 'react';
import { HoverScale } from '@/components/ui/animated-page';

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
    const [isEscalating, setIsEscalating] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEscalation = async () => {
        if (isEscalating) return;

        setIsEscalating(true);
        setError(null);

        try {
            const response = await fetch('/api/escalate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId,
                    sessionId,
                    userMessage: userMessage || 'Manual escalation requested by agent',
                    reason: 'manual',
                    fromChat: false,
                    skipWebhooks: false
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
        } finally {
            setIsEscalating(false);
        }
    };

    return (
        <div className="space-y-2">
            <HoverScale scale={1.02}>
                <button
                    onClick={handleEscalation}
                    disabled={disabled || isEscalating || success}
                    className={`btn btn-secondary btn-block rounded-xl justify-start ${success ? 'btn-success' : ''
                        }`}
                >
                    {isEscalating ? (
                        <>
                            <span className="loading loading-spinner loading-xs" />
                            Escalating...
                        </>
                    ) : success ? (
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
                    Conversation has been escalated to your configured support channels.
                </div>
            )}
        </div>
    );
}
