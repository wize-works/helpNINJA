"use client";
import { HoverScale } from '@/components/ui/animated-page';
import { useState } from 'react';

export default function CopySessionIdButton({ sessionId }: { sessionId: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(sessionId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };
    return (
        <HoverScale scale={1.02}>
            <button type="button" onClick={handleCopy} className="btn btn-sm  rounded-lg">
                <i className="fa-duotone fa-solid fa-copy" /> {copied ? 'Copied!' : 'Copy Session ID'}
            </button>
        </HoverScale>
    );
}
