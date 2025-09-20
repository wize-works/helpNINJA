"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { HoverScale } from '@/components/ui/animated-page';

interface Filters {
    search?: string;
    status?: string;
    provider?: string;
    ruleId?: string;
}

interface RuleOption {
    id: string;
    name: string;
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
    filters,
    rules = []
}: {
    filters: Filters;
    rules?: RuleOption[];
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
        ['search', 'status', 'provider', 'ruleId'].forEach(k => {
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
    const activeFilterCount = ['search', 'status', 'provider', 'ruleId']
        .filter(k => filters[k as keyof Filters]).length;

    return (
        <div className="relative">
            <HoverScale scale={1.02}>
                <button
                    onClick={() => setOpen(o => !o)}
                    className="btn rounded-xl"
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
                            <h4 className="text-sm font-semibold">Filter Delivery Items</h4>
                            <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">Close</button>
                        </div>
                        <div className="space-y-3">
                            {/* Search input with debounce */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Search</label>
                                <input
                                    className="input input-sm input-bordered w-full"
                                    placeholder="Search by integration name, error..."
                                    value={local.search || ''}
                                    onChange={e => setLocal(l => ({ ...l, search: e.target.value || undefined }))}
                                />
                            </div>

                            {/* Status dropdown */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Status</label>
                                <select
                                    className="select select-sm select-bordered w-full"
                                    value={local.status || ''}
                                    onChange={e => setLocal(l => ({ ...l, status: e.target.value || undefined }))}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="sent">Sent</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>

                            {/* Provider dropdown */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Provider</label>
                                <select
                                    className="select select-sm select-bordered w-full"
                                    value={local.provider || ''}
                                    onChange={e => setLocal(l => ({ ...l, provider: e.target.value || undefined }))}
                                >
                                    <option value="">All Providers</option>
                                    <option value="slack">Slack</option>
                                    <option value="email">Email</option>
                                    <option value="teams">Microsoft Teams</option>
                                    <option value="discord">Discord</option>
                                </select>
                            </div>

                            {/* Rule dropdown */}
                            {rules.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium uppercase tracking-wide opacity-70">Escalation Rule</label>
                                    <select
                                        className="select select-sm select-bordered w-full"
                                        value={local.ruleId || ''}
                                        onChange={e => setLocal(l => ({ ...l, ruleId: e.target.value || undefined }))}
                                    >
                                        <option value="">All Rules</option>
                                        {rules.map(rule => (
                                            <option key={rule.id} value={rule.id}>
                                                {rule.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
