"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { renderMarkdown } from '@/lib/render-markdown';
import { HoverScale } from '@/components/ui/animated-page';

interface Message { id: string; role: string; content: string; created_at: string; confidence: number | null }

interface Props { conversationId: string; initialMessages: Message[]; total: number; }

export default function ConversationTranscript({ conversationId, initialMessages, total }: Props) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [loaded, setLoaded] = useState(initialMessages.length);
    const [hasMore, setHasMore] = useState(initialMessages.length < total);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [exporting, setExporting] = useState(false);
    const loadRef = useRef<HTMLDivElement | null>(null);

    const fetchMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        const res = await fetch(`/api/conversations/${conversationId}/messages?offset=${loaded}&limit=50${query ? `&q=${encodeURIComponent(query)}` : ''}`);
        if (res.ok) {
            const data = await res.json();
            setMessages(prev => [...prev, ...data.messages]);
            setLoaded(prev => prev + data.messages.length);
            setHasMore(loaded + data.messages.length < data.total);
        }
        setLoading(false);
    }, [conversationId, loaded, hasMore, loading, query]);

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (!hasMore) return;
        const el = loadRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) fetchMore();
        }, { rootMargin: '400px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, [fetchMore, hasMore]);

    // Client-side highlight filtering
    const filteredMessages = useMemo(() => {
        if (!query) return messages;
        const lower = query.toLowerCase();
        return messages.filter(m => m.content.toLowerCase().includes(lower));
    }, [query, messages]);

    const highlight = (text: string): (string | React.ReactElement)[] => {
        if (!query) return [text];
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'ig');
        return text.split(regex).map((part, i) => regex.test(part) ? <mark key={i} className="bg-warning/40 rounded px-0.5">{part}</mark> : part);
    };

    function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); /* already live filtering */ };

    const exportJson = async () => {
        setExporting(true);
        try {
            const blob = new Blob([JSON.stringify({ conversationId, messages }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `conversation-${conversationId}.json`; a.click();
            URL.revokeObjectURL(url);
        } finally { setExporting(false); }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <i className="fa-duotone fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-xs" />
                        <input value={query} onChange={e => { setMessages(initialMessages); setLoaded(initialMessages.length); setHasMore(initialMessages.length < total); setQuery(e.target.value); }} className="input input-sm input-bordered pl-8 w-full" placeholder="Search in transcript..." />
                    </div>
                </form>
                <div className="flex items-center gap-2">
                    <HoverScale scale={1.02}>
                        <button type="button" onClick={exportJson} disabled={exporting} className="btn btn-sm btn-ghost rounded-lg">
                            <i className="fa-duotone fa-solid fa-download" /> {exporting ? 'Exporting...' : 'Export JSON'}
                        </button>
                    </HoverScale>
                </div>
            </div>
            <div className="space-y-6">
                {filteredMessages.map(m => (
                    <div key={m.id} className={`chat ${m.role === 'user' ? 'chat-start' : 'chat-end'}`}>
                        <div className={`chat-bubble whitespace-pre-wrap break-words max-w-[640px] ${m.role === 'user' ? 'bg-base-200 text-base-content' : 'bg-primary text-primary-content'}`}>
                            {m.role === 'assistant' ? renderMarkdown(m.content) : highlight(m.content)}
                        </div>
                        <div className="text-[10px] opacity-60 mt-1 flex items-center gap-1">
                            {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            {m.role !== 'user' && typeof m.confidence === 'number' && isFinite(m.confidence) && (
                                <span className={`badge badge-xs ${m.confidence < 0.55 ? 'badge-warning' : 'badge-ghost'}`} title="Model confidence score">{m.confidence.toFixed(2)}</span>
                            )}
                        </div>
                    </div>
                ))}
                {hasMore && (
                    <div ref={loadRef} className="flex items-center justify-center py-4 text-xs opacity-60">
                        {loading ? 'Loading…' : 'Scroll to load more'}
                    </div>
                )}
                {!hasMore && filteredMessages.length === 0 && (
                    <div className="text-xs opacity-60">No messages match your search.</div>
                )}
            </div>
        </div>
    );
}
