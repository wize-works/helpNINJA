"use client";

import { useState, useEffect } from 'react';
import { useTenant } from "@/components/tenant-context";

type Site = {
    id: string;
    name: string;
    domain: string;
    status: 'verified' | 'pending' | 'failed';
};

type SiteFilterProps = {
    selectedSite: string | null;
    onSiteChange: (siteId: string | null) => void;
    className?: string;
};

export function SiteFilter({ selectedSite, onSiteChange, className = "" }: SiteFilterProps) {
    const { tenantId } = useTenant();
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) return;

        async function fetchSites() {
            try {
                setLoading(true);
                const response = await fetch('/api/sites');

                if (response.ok) {
                    const data = await response.json();
                    setSites(data.sites || []);
                }
            } catch (error) {
                console.error('Error fetching sites:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchSites();
    }, [tenantId]);

    if (loading) {
        return (
            <div className={`skeleton h-10 w-48 ${className}`}></div>
        );
    }

    if (sites.length === 0) {
        return null; // Don't show filter if no sites
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <label className="text-sm font-medium text-base-content/70">Site:</label>
            <select
                className="select select-bordered select-sm w-full max-w-xs"
                value={selectedSite || ''}
                onChange={(e) => onSiteChange(e.target.value || null)}
            >
                <option value="">All Sites</option>
                {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                        {site.name} ({site.domain})
                    </option>
                ))}
            </select>
            {sites.length > 1 && (
                <div className="text-xs text-base-content/60">
                    {sites.length} site{sites.length !== 1 ? 's' : ''} available
                </div>
            )}
        </div>
    );
}

type TimeRangeFilterProps = {
    selectedRange: string;
    onRangeChange: (range: string) => void;
    className?: string;
};

export function TimeRangeFilter({ selectedRange, onRangeChange, className = "" }: TimeRangeFilterProps) {
    const ranges = [
        { value: '1d', label: 'Last 24 hours' },
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
        { value: '90d', label: 'Last 90 days' }
    ];

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <label className="text-sm font-medium text-base-content/70">Period:</label>
            <select
                className="select select-bordered select-sm w-full max-w-xs"
                value={selectedRange}
                onChange={(e) => onRangeChange(e.target.value)}
            >
                {ranges.map((range) => (
                    <option key={range.value} value={range.value}>
                        {range.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// Legacy props type removed along with the deprecated AnalyticsFilters wrapper.

// Removed legacy AnalyticsFilters wrapper; use page-specific filter controls instead.
