"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { renderMarkdown } from '@/lib/render-markdown';
import { HoverScale } from '@/components/ui/animated-page';

interface Message { id: string; role: string; content: string; created_at: string; confidence: number | null; is_human_response: boolean }
interface Escalation { id: string; reason: string; confidence: number | null; rule_id: string | null; created_at: string }

interface Props {
    conversationId: string;
    initialMessages: Message[];
    total: number;
    escalations?: Escalation[];
}

export default function ConversationTranscript({ conversationId, initialMessages, total, escalations = [] }: Props) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [loaded, setLoaded] = useState(initialMessages.length);
    const [hasMore, setHasMore] = useState(initialMessages.length < total);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [exporting, setExporting] = useState(false);
    const [isPolling, setIsPolling] = useState(true);
    const loadRef = useRef<HTMLDivElement | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

    // Polling for new messages
    const pollForNewMessages = useCallback(async () => {
        if (!isPolling || query) return; // Don't poll when searching

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) return;

        try {
            // Convert to ISO format to avoid timezone issues
            const sinceDate = new Date(lastMessage.created_at).toISOString();
            const res = await fetch(`/api/conversations/${conversationId}/messages?since=${encodeURIComponent(sinceDate)}&limit=50`);
            if (res.ok) {
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    setMessages(prev => {
                        // Create a Set of existing message IDs for fast lookup
                        const existingIds = new Set(prev.map(m => m.id));

                        // Filter out messages that are already in the array
                        const newMessages = data.messages.filter((msg: Message) => !existingIds.has(msg.id));

                        if (newMessages.length > 0) {
                            // Auto-scroll to bottom when new messages arrive
                            setTimeout(() => {
                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);

                            return [...prev, ...newMessages];
                        }

                        return prev; // No new messages, return existing array
                    });
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, [conversationId, messages, isPolling, query]);



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

    // Real-time polling for new messages
    useEffect(() => {
        if (!isPolling || query) return;

        const startPolling = () => {
            pollingRef.current = setInterval(pollForNewMessages, 2000); // Poll every 2 seconds
        };

        const stopPolling = () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };

        startPolling();
        return stopPolling;
    }, [pollForNewMessages, isPolling, query]);

    // Stop polling when component unmounts
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

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
                        <button type="button" onClick={() => setIsPolling(!isPolling)} className={`btn btn-sm btn-ghost rounded-lg ${isPolling ? 'text-success' : 'text-base-content/60'}`}>
                            <i className={`fa-duotone fa-solid ${isPolling ? 'fa-satellite-dish' : 'fa-satellite-dish'}`} /> {isPolling ? 'Live' : 'Paused'}
                        </button>
                    </HoverScale>
                    <HoverScale scale={1.02}>
                        <button type="button" onClick={exportJson} disabled={exporting} className="btn btn-sm btn-ghost rounded-lg">
                            <i className="fa-duotone fa-solid fa-download" /> {exporting ? 'Exporting...' : 'Export JSON'}
                        </button>
                    </HoverScale>
                </div>
            </div>
            <div className="space-y-6">
                {filteredMessages.map(m => {
                    const escForMessage = escalations.filter(e => Math.abs(new Date(e.created_at).getTime() - new Date(m.created_at).getTime()) < 1500);
                    return (
                        <div key={m.id} className="space-y-1">
                            <div className={`chat ${m.role === 'user' ? 'chat-start' : 'chat-end'}`}>
                                {m.role === 'assistant' && (
                                    <div className="chat-header mb-1">
                                        {m.is_human_response ? (
                                            <span className="inline-flex items-center gap-1 text-xs bg-success/20 text-success px-2 py-1 rounded-md">
                                                <i className="fa-duotone fa-solid fa-user-headset" />
                                                Human Agent
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-1 rounded-md">
                                                <i className="fa-duotone fa-solid fa-robot" />
                                                AI Assistant
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className={`chat-bubble whitespace-pre-wrap break-words max-w-[640px] ${m.role === 'user' ? 'bg-base-200 text-base-content' : m.is_human_response ? 'bg-success text-success-content' : 'bg-primary text-primary-content'}`}>
                                    {m.role === 'assistant' ? renderMarkdown(m.content) : highlight(m.content)}
                                </div>
                                <div className="text-[10px] opacity-60 mt-1 flex items-center gap-1">
                                    {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    {m.role !== 'user' && typeof m.confidence === 'number' && isFinite(m.confidence) && !m.is_human_response && (
                                        <span className={`badge badge-xs ${m.confidence < 0.55 ? 'badge-warning' : 'badge-ghost'}`} title="Model confidence score">{m.confidence.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                            {escForMessage.map(e => (
                                <div key={e.id} className="flex items-center gap-2 text-[10px] font-medium pl-6">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/15 text-warning border border-warning/30" title={`Escalation: ${e.reason}`}>
                                        <i className="fa-duotone fa-solid fa-arrow-up-right-from-square" /> Escalated {e.reason.replace(/_/g, ' ')}{typeof e.confidence === 'number' ? ` · conf ${e.confidence.toFixed(2)}` : ''}
                                    </span>
                                    {e.rule_id && <span className="badge badge-ghost badge-xs" title={e.rule_id}>Rule</span>}
                                </div>
                            ))}
                        </div>
                    );
                })}
                {hasMore && (
                    <div ref={loadRef} className="flex items-center justify-center py-4 text-xs opacity-60">
                        {loading ? 'Loading…' : 'Scroll to load more'}
                    </div>
                )}
                {!hasMore && filteredMessages.length === 0 && (
                    <div className="text-xs opacity-60">No messages match your search.</div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
