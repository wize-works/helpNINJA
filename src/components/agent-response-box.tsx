'use client';

import { useState } from 'react';
import { HoverScale } from '@/components/ui/animated-page';

interface AgentResponseBoxProps {
    conversationId: string;
}

export default function AgentResponseBox({ conversationId }: AgentResponseBoxProps) {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/conversations/${conversationId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message.trim() })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('');
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
                // Refresh the page to show new message
                window.location.reload();
            } else {
                throw new Error(data.error || 'Failed to send response');
            }
        } catch (err) {
            console.error('Send response error:', err);
            setError((err as Error).message || 'Failed to send response. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const characterCount = message.length;
    const maxLength = 1000;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your response to the user..."
                    className="textarea textarea-bordered w-full h-24 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={isLoading}
                    maxLength={maxLength}
                />
                <div className="flex items-center justify-between mt-2">
                    <span className={`text-sm ${characterCount > maxLength * 0.9 ? 'text-warning' : 'text-base-content/60'}`}>
                        {characterCount}/{maxLength} characters
                    </span>
                    {success && (
                        <span className="text-sm text-success font-medium">
                            <i className="fa-duotone fa-solid fa-check mr-1" />
                            Response sent!
                        </span>
                    )}
                    {error && (
                        <span className="text-sm text-error font-medium">
                            <i className="fa-duotone fa-solid fa-triangle-exclamation mr-1" />
                            {error}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                    <i className="fa-duotone fa-solid fa-info-circle" />
                    This will be sent directly to the user in their chat widget
                </div>
                <HoverScale scale={1.02}>
                    <button
                        type="submit"
                        disabled={!message.trim() || isLoading || characterCount > maxLength}
                        className="btn btn-primary rounded-xl px-6 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <span className="loading loading-spinner loading-sm mr-2" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <i className="fa-duotone fa-solid fa-paper-plane mr-2" />
                                Send Response
                            </>
                        )}
                    </button>
                </HoverScale>
            </div>
        </form>
    );
}
