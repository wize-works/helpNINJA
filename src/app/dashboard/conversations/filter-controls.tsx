"use client";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { HoverScale } from '@/components/ui/animated-page';

interface Filters {
    escalated?: string;
    range?: string;
    search?: string;
    site?: string;
}

function useDebounced<T>(value: T, delay = 400) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

interface SiteOpt { id: string; domain: string; name: string }

export default function FilterControls({ filters, sites = [] }: { filters: Filters; sites?: SiteOpt[] }) {
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
        ['escalated', 'range', 'search', 'site'].forEach(k => {
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

    return (
        <div className="relative">
            <HoverScale scale={1.02}>
                <button onClick={() => setOpen(o => !o)} className="btn btn-sm rounded-lg">
                    <i className="fa-duotone fa-solid fa-filter text-xs" aria-hidden />
                    Filters
                    {(filters.escalated || filters.range || filters.search || filters.site) && (
                        <span className="ml-1 inline-flex items-center justify-center px-1.5 h-5 text-[10px] rounded bg-primary text-primary-content">
                            {(['escalated', 'range', 'search', 'site'] as (keyof Filters)[]).filter(k => filters[k]).length}
                        </span>
                    )}
                    <i className={`fa-duotone fa-solid fa-chevron-${open ? 'up' : 'down'} text-[10px] opacity-70`} />
                </button>
            </HoverScale>
            {open && (
                <div className="absolute right-0 mt-2 w-80 z-20">
                    <div className="card bg-base-100 rounded-2xl shadow-lg border border-base-300/40 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Filter Conversations</h4>
                            <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">Close</button>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Search</label>
                                <input
                                    className="input input-sm input-bordered w-full"
                                    placeholder="Session ID"
                                    value={local.search || ''}
                                    onChange={e => setLocal(l => ({ ...l, search: e.target.value || undefined }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Escalated</label>
                                <select
                                    className="select select-sm select-bordered w-full"
                                    value={local.escalated || ''}
                                    onChange={e => setLocal(l => ({ ...l, escalated: e.target.value || undefined }))}
                                >
                                    <option value="">Any</option>
                                    <option value="1">Only escalated</option>
                                    <option value="0">No escalations</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Time Range</label>
                                <div className="grid grid-cols-4 gap-1">
                                    {['24h', '7d', '30d'].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setLocal(l => ({ ...l, range: l.range === r ? undefined : r }))}
                                            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${local.range === r ? 'bg-primary text-primary-content border-primary' : 'border-base-300/40 bg-base-200/60 hover:bg-base-200'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Site</label>
                                <select
                                    className="select select-sm select-bordered w-full"
                                    value={local.site || ''}
                                    onChange={e => setLocal(l => ({ ...l, site: e.target.value || undefined }))}
                                >
                                    <option value="">All sites</option>
                                    {sites.map(s => (
                                        <option key={s.id} value={s.id}>{s.domain || s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
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
