"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function FeedbackFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [filters, setFilters] = useState({
        type: searchParams.get('type') || '',
        status: searchParams.get('status') || '',
        priority: searchParams.get('priority') || '',
        search: searchParams.get('search') || ''
    });

    const updateURL = (newFilters: typeof filters) => {
        const params = new URLSearchParams();
        
        Object.entries(newFilters).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            }
        });
        
        const queryString = params.toString();
        router.push(`/dashboard/feedback${queryString ? `?${queryString}` : ''}`);
    };

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        updateURL(newFilters);
    };

    const clearFilters = () => {
        const newFilters = { type: '', status: '', priority: '', search: '' };
        setFilters(newFilters);
        updateURL(newFilters);
    };

    const hasActiveFilters = Object.values(filters).some(value => value !== '');

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">
                    <i className="fa-duotone fa-solid fa-magnifying-glass text-sm" />
                </div>
                <input
                    type="text"
                    placeholder="Search feedback..."
                    className="input input-bordered input-sm pl-10 w-full"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex gap-2 flex-wrap">
                {/* Type Filter */}
                <select
                    className="select select-bordered select-sm min-w-[120px]"
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                    <option value="">All Types</option>
                    <option value="bug">Bug Reports</option>
                    <option value="feature_request">Feature Requests</option>
                    <option value="improvement">Improvements</option>
                    <option value="ui_ux">UI/UX</option>
                    <option value="performance">Performance</option>
                    <option value="general">General</option>
                </select>

                {/* Status Filter */}
                <select
                    className="select select-bordered select-sm min-w-[120px]"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
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

                {/* Priority Filter */}
                <select
                    className="select select-bordered select-sm min-w-[110px]"
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                >
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="btn btn-ghost btn-sm text-base-content/60 hover:text-base-content"
                        title="Clear all filters"
                    >
                        <i className="fa-duotone fa-solid fa-times" />
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
