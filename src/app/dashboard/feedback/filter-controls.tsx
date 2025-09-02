"use client";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { HoverScale } from '@/components/ui/animated-page';

// Define filters interface for feedback
interface Filters {
    type?: string;
    status?: string;
    priority?: string;
    search?: string;
    siteId?: string;
}

// Site option type
interface SiteOption {
    id: string;
    domain: string;
    name?: string;
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
    sites = []
}: {
    filters: Filters;
    sites?: SiteOption[]
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
        // Update for feedback-specific filter keys
        ['type', 'status', 'priority', 'search', 'siteId'].forEach(k => {
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
    const activeFilterCount = ['type', 'status', 'priority', 'search', 'siteId']
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
                            <h4 className="text-sm font-semibold">Filter Feedback</h4>
                            <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">Close</button>
                        </div>
                        <div className="space-y-3">
                            {/* Search input with debounce */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Search</label>
                                <input
                                    className="input input-sm input-bordered w-full"
                                    placeholder="Search feedback..."
                                    value={local.search || ''}
                                    onChange={e => setLocal(l => ({ ...l, search: e.target.value || undefined }))}
                                />
                            </div>

                            {/* Type dropdown */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Type</label>
                                <select
                                    className="select select-sm select-bordered w-full"
                                    value={local.type || ''}
                                    onChange={e => setLocal(l => ({ ...l, type: e.target.value || undefined }))}
                                >
                                    <option value="">All Types</option>
                                    <option value="bug">Bug Reports</option>
                                    <option value="feature_request">Feature Requests</option>
                                    <option value="improvement">Improvements</option>
                                    <option value="ui_ux">UI/UX</option>
                                    <option value="performance">Performance</option>
                                    <option value="general">General</option>
                                </select>
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
                                    <option value="open">Open</option>
                                    <option value="in_review">In Review</option>
                                    <option value="planned">Planned</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="duplicate">Duplicate</option>
                                </select>
                            </div>

                            {/* Priority dropdown */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide opacity-70">Priority</label>
                                <select
                                    className="select select-sm select-bordered w-full"
                                    value={local.priority || ''}
                                    onChange={e => setLocal(l => ({ ...l, priority: e.target.value || undefined }))}
                                >
                                    <option value="">All Priorities</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>

                            {/* Site dropdown */}
                            {sites.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium uppercase tracking-wide opacity-70">Site</label>
                                    <select
                                        className="select select-sm select-bordered w-full"
                                        value={local.siteId || ''}
                                        onChange={e => setLocal(l => ({ ...l, siteId: e.target.value || undefined }))}
                                    >
                                        <option value="">All Sites</option>
                                        {sites.map(site => (
                                            <option key={site.id} value={site.id}>
                                                {site.name || site.domain}
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
