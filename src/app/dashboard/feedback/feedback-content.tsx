"use client";

import { Suspense } from 'react';
import { FeedbackTable } from '@/components/feedback-table';
import { FeedbackAnalytics } from '@/components/feedback-analytics';
import { StaggerContainer, StaggerChild } from '@/components/ui/animated-page';
import FilterControls from './filter-controls';

interface Filters {
    type?: string;
    status?: string;
    priority?: string;
    search?: string;
    siteId?: string;
    days?: string;
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

export default function FeedbackContent({ tenantId }: FeedbackContentProps) {
    return (
        <StaggerContainer>
            {/* Header with Filters */}
            <StaggerChild>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-base-content">Feedback</h1>
                        <p className="text-sm text-base-content/60">Analytics and management of user-submitted feedback</p>
                    </div>
                </div>
            </StaggerChild>
            {/* Analytics Section */}
            <StaggerChild>
                <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 mb-10">
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
            </StaggerChild>

            {/* Feedback Management */}
            <StaggerChild>

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
            </StaggerChild>
        </StaggerContainer>
    );
}
