"use client";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HoverScale } from '@/components/ui/animated-page';
import SiteSelector from '@/components/site-selector';

type Range = '7d' | '30d' | '90d' | 'all'

interface Filters {
    range?: Range;
    siteId?: string;
}

const LS_RANGE_KEY = 'hn_analytics_range'
const LS_SITE_KEY = 'hn_analytics_site'

export default function FilterControls({ filters }: { filters: Filters }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [local, setLocal] = useState<Filters>(filters);

    useEffect(() => {
        // Initialize from localStorage if URL lacks params
        const hasRange = !!searchParams.get('range');
        const hasSite = !!searchParams.get('siteId');
        const next = new URLSearchParams(searchParams.toString());
        let changed = false;
        if (!hasRange) {
            const storedRange = (typeof window !== 'undefined' ? (localStorage.getItem(LS_RANGE_KEY) as Range | null) : null);
            if (storedRange) { next.set('range', storedRange); changed = true }
        }
        if (!hasSite) {
            const storedSite = typeof window !== 'undefined' ? localStorage.getItem(LS_SITE_KEY) : null;
            if (storedSite != null && storedSite.length > 0) { next.set('siteId', storedSite); changed = true }
        }
        if (changed) router.replace(`${pathname}?${next.toString()}`)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function applyFilters(next: Filters, replace = true) {
        const params = new URLSearchParams(searchParams?.toString() || '');
        const range = next.range || undefined;
        const siteId = next.siteId || undefined;
        if (range) params.set('range', range); else params.delete('range');
        if (siteId) params.set('siteId', siteId); else params.delete('siteId');
        try { if (range) localStorage.setItem(LS_RANGE_KEY, range) } catch { }
        try { localStorage.setItem(LS_SITE_KEY, siteId || '') } catch { }
        const url = `${pathname}?${params.toString()}`;
        if (replace) router.replace(url); else router.push(url);
    }

    function clearFilters() {
        setLocal({});
        try { localStorage.removeItem(LS_RANGE_KEY); localStorage.removeItem(LS_SITE_KEY); } catch { }
        router.replace(pathname);
    }

    const activeFilterCount = (filters.range ? 1 : 0) + (filters.siteId ? 1 : 0);

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
                            <h4 className="text-sm font-semibold">Filter Analytics</h4>
                            <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">Close</button>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Time Range</label>
                                <div className="grid grid-cols-4 gap-1">
                                    {(['7d', '30d', '90d', 'all'] as Range[]).map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setLocal(l => ({ ...l, range: l.range === r ? undefined : r }))}
                                            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${local.range === r ? 'bg-primary text-primary-content border-primary' : 'border-base-300/40 bg-base-200/60 hover:bg-base-200'}`}
                                        >
                                            {r === 'all' ? 'ALL' : r.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Site</label>
                                <SiteSelector
                                    value={local.siteId || ''}
                                    onChange={(siteId) => setLocal(l => ({ ...l, siteId: siteId || '' }))}
                                    allowNone
                                    noneLabel="All sites"
                                    className="select-sm w-full"
                                />
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
