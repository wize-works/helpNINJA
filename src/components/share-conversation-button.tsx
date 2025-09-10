'use client';

import { useState } from 'react';
import { HoverScale } from '@/components/ui/animated-page';

interface ShareConversationButtonProps {
    conversationId: string;
    disabled?: boolean;
}

export default function ShareConversationButton({
    conversationId,
    disabled = false
}: ShareConversationButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generateShareLink = async () => {
        if (isGenerating) return;

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/conversations/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId,
                    expiresInDays: 30 // Default 30-day expiration
                })
            });

            const data = await response.json();

            if (response.ok && data.shareUrl) {
                setShareUrl(data.shareUrl);
            } else {
                throw new Error(data.error || 'Failed to generate share link');
            }
        } catch (err) {
            console.error('Share generation error:', err);
            setError((err as Error).message || 'Failed to generate share link. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy error:', err);
            setError('Failed to copy to clipboard');
        }
    };

    const revokeShare = async () => {
        if (!shareUrl) return;

        try {
            const response = await fetch('/api/conversations/share', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId })
            });

            if (response.ok) {
                setShareUrl(null);
                setCopied(false);
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to revoke share');
            }
        } catch (err) {
            console.error('Revoke error:', err);
            setError((err as Error).message || 'Failed to revoke share link. Please try again.');
        }
    };

    return (
        <div className="space-y-3">
            {!shareUrl ? (
                <HoverScale scale={1.02}>
                    <button
                        onClick={generateShareLink}
                        disabled={disabled || isGenerating}
                        className="btn btn-outline btn-block rounded-xl justify-start"
                    >
                        {isGenerating ? (
                            <>
                                <span className="loading loading-spinner loading-xs" />
                                Generating Link...
                            </>
                        ) : (
                            <>
                                <i className="fa-duotone fa-solid fa-share text-xs" />
                                Share Conversation
                            </>
                        )}
                    </button>
                </HoverScale>
            ) : (
                <div className="space-y-2">
                    <div className="text-xs font-medium text-success mb-2">
                        <i className="fa-duotone fa-solid fa-check mr-1" />
                        Share link generated
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="input input-bordered input-xs w-full text-xs font-mono"
                                title={shareUrl}
                            />
                        </div>

                        <HoverScale scale={1.02}>
                            <button
                                onClick={copyToClipboard}
                                className={`btn btn-xs rounded-lg ${copied ? 'btn-success' : 'btn-outline'}`}
                                title={copied ? 'Copied!' : 'Copy to clipboard'}
                            >
                                {copied ? (
                                    <i className="fa-duotone fa-solid fa-check text-xs" />
                                ) : (
                                    <i className="fa-duotone fa-solid fa-copy text-xs" />
                                )}
                            </button>
                        </HoverScale>
                    </div>

                    <div className="flex gap-2">
                        <HoverScale scale={1.02}>
                            <button
                                onClick={() => window.open(shareUrl, '_blank')}
                                className="btn btn-primary btn-xs rounded-lg flex-1"
                            >
                                <i className="fa-duotone fa-solid fa-external-link text-xs" />
                                Preview
                            </button>
                        </HoverScale>

                        <HoverScale scale={1.02}>
                            <button
                                onClick={revokeShare}
                                className="btn btn-error btn-xs rounded-lg"
                                title="Revoke share link"
                            >
                                <i className="fa-duotone fa-solid fa-trash text-xs" />
                            </button>
                        </HoverScale>
                    </div>

                    <div className="text-xs text-base-content/60">
                        <i className="fa-duotone fa-solid fa-clock mr-1" />
                        Expires in 30 days
                    </div>
                </div>
            )}

            {error && (
                <div className="text-xs text-error px-2">
                    <i className="fa-duotone fa-solid fa-triangle-exclamation mr-1" />
                    {error}
                </div>
            )}
        </div>
    );
}
