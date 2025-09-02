"use client";

import { Suspense } from 'react';
import { FeedbackTable } from '@/components/feedback-table';
import { FeedbackAnalytics } from '@/components/feedback-analytics';
import FilterControls from './filter-controls';

interface Filters {
    type?: string;
    status?: string;
    priority?: string;
    search?: string;
    siteId?: string;
}

interface SiteOption {
    id: string;
    domain: string;
    name?: string;
}

interface FeedbackContentProps {
    tenantId: string;
    filters: Filters;
    sites: SiteOption[];
}

export default function FeedbackContent({ tenantId, filters, sites }: FeedbackContentProps) {
    return (
        <>
            {/* Analytics Section */}
            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-chart-bar text-lg text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-base-content">Feedback Analytics</h2>
                            <p className="text-sm text-base-content/60">Trends and insights from user feedback</p>
                        </div>
                    </div>

                    <Suspense fallback={
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {Array.from({ length: 4 }, (_, i) => (
                                <div key={i} className="h-64 bg-base-200/60 rounded-xl animate-pulse"></div>
                            ))}
                        </div>
                    }>
                        <FeedbackAnalytics tenantId={tenantId} />
                    </Suspense>
                </div>
            </div>

            {/* Feedback Management */}
            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                                <i className="fa-duotone fa-solid fa-list-check text-lg text-secondary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-base-content">Feedback Management</h2>
                                <p className="text-sm text-base-content/60">View, filter, and manage all feedback submissions</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <FilterControls filters={filters} sites={sites} />
                            <div className="badge badge-primary badge-sm ml-2">
                                <i className="fa-duotone fa-solid fa-sparkles text-xs mr-1" />
                                Auto-escalation enabled
                            </div>
                        </div>
                    </div>

                    {/* Feedback Table */}
                    <Suspense fallback={
                        <div className="space-y-4">
                            <div className="h-12 bg-base-200/60 rounded animate-pulse"></div>
                            {Array.from({ length: 5 }, (_, i) => (
                                <div key={i} className="h-16 bg-base-200/40 rounded animate-pulse"></div>
                            ))}
                        </div>
                    }>
                        <FeedbackTable tenantId={tenantId} />
                    </Suspense>
                </div>
            </div>
        </>
    );
}
