"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { HoverScale } from '@/components/ui/animated-page';

interface Filters {
    search?: string;
    event?: string;
    dateRange?: string;
}

// Debounce hook for search inputs
function useDebounced<T>(value: T, delay = 400) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

export default function FilterControls({
    filters
}: {
    filters: Filters;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [local, setLocal] = useState<Filters>(filters);
    const debouncedSearch = useDebounced(local.search);

    // Push changes when debounced search changes
    useEffect(() => {
        applyFilters({ ...local, search: debouncedSearch });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    function applyFilters(next: Filters, replace = true) {
        const params = new URLSearchParams(searchParams?.toString() || '');
        ['search', 'event', 'dateRange'].forEach(k => {
            const val = (next as Record<string, string | undefined>)[k];
            if (val) params.set(k, val); else params.delete(k);
        });
        const url = `${pathname}?${params.toString()}`;
        if (replace) router.replace(url); else router.push(url);
    }

    function clearFilters() {
        setLocal({});
        router.replace(pathname);
    }

    // Count active filters for the badge
    const activeFilterCount = ['search', 'event', 'dateRange']
        .filter(k => filters[k as keyof Filters]).length;

    return (
        <div className="relative">
            <HoverScale scale={1.02}>
                <button
                    onClick={() => setOpen(o => !o)}
                    className="flex items-center gap-2 px-4 py-2 bg-base-200/60 hover:bg-base-200 border border-base-300/40 rounded-lg text-sm font-medium transition-all duration-200"
                >
                    <i className="fa-duotone fa-solid fa-filter text-xs" aria-hidden />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center px-1.5 h-5 text-[10px] rounded bg-primary text-primary-content">
                            {activeFilterCount}
                        </span>
                    )}
                    <i className={`fa-duotone fa-solid fa-chevron-${open ? 'up' : 'down'} text-[10px] opacity-70`} />
                </button>
            </HoverScale>
            {open && (
                <div className="absolute right-0 mt-2 w-80 z-20">
                    <div className="card bg-base-100 rounded-2xl shadow-lg border border-base-300/40 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Filter Events</h4>
                            <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">Close</button>
                        </div>
                        <div className="space-y-3">
                            {/* Search input with debounce */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Search</label>
                                <input
                                    className="input input-sm input-bordered w-full"
                                    placeholder="Search event data..."
                                    value={local.search || ''}
                                    onChange={e => setLocal(l => ({ ...l, search: e.target.value || undefined }))}
                                />
                            </div>

                            {/* Event type dropdown */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Event Type</label>
                                <select
                                    className="select select-sm select-bordered w-full"
                                    value={local.event || ''}
                                    onChange={e => setLocal(l => ({ ...l, event: e.target.value || undefined }))}
                                >
                                    <option value="">All Events</option>
                                    <option value="conversation_started">Conversation Started</option>
                                    <option value="message_sent">Message Sent</option>
                                    <option value="escalation_triggered">Escalation Triggered</option>
                                    <option value="checkout_completed">Checkout Completed</option>
                                    <option value="plan_updated">Plan Updated</option>
                                    <option value="ingest_started">Ingest Started</option>
                                    <option value="ingest_completed">Ingest Completed</option>
                                    <option value="ingest_failed">Ingest Failed</option>
                                    <option value="integration_failed">Integration Failed</option>
                                    <option value="integration_succeeded">Integration Succeeded</option>
                                    <option value="quota_exceeded">Quota Exceeded</option>
                                    <option value="feedback_submitted">Feedback Submitted</option>
                                    <option value="feedback_updated">Feedback Updated</option>
                                    <option value="feedback_deleted">Feedback Deleted</option>
                                    <option value="feedback_escalated">Feedback Escalated</option>
                                    <option value="feedback_comment_added">Feedback Comment Added</option>
                                    <option value="feedback_escalation_failed">Feedback Escalation Failed</option>
                                </select>
                            </div>

                            {/* Date range buttons */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Time Range</label>
                                <div className="grid grid-cols-4 gap-1">
                                    {['1h', '24h', '7d', '30d'].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setLocal(l => ({
                                                ...l,
                                                dateRange: l.dateRange === r ? undefined : r
                                            }))}
                                            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${local.dateRange === r
                                                    ? 'bg-primary text-primary-content border-primary'
                                                    : 'border-base-300/40 bg-base-200/60 hover:bg-base-200'
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Action buttons - REQUIRED: Always include both Apply and Reset buttons */}
                        <div className="flex items-center justify-between pt-2 gap-2">
                            <button
                                onClick={() => { applyFilters(local, false); setOpen(false); }}
                                className="btn btn-primary btn-sm rounded-lg flex-1"
                            >
                                Apply
                            </button>
                            <button
                                onClick={clearFilters}
                                className="btn btn-sm rounded-lg flex-1"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
