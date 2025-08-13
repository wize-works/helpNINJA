"use client";

import { useState, useEffect } from 'react';
import { useTenant } from "@/components/tenant-context";
import { StaggerChild } from "@/components/ui/animated-page";
import { IntegrationHealthDashboard } from "./integration-health-dashboard";
import { ExportControls } from "./export-controls";
import { SiteFilter } from "./site-filter";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";

// Import the existing chart components
import {
    ConversationTrendsChart,
    ConfidenceAnalysisChart,
    ResponseTimeChart,
    TopSourcesChart
} from "../../app/dashboard/analytics/analytics-charts";
import { AnalyticsOverview } from "./analytics-overview";

type AnalyticsData = {
    totalMessages: number;
    totalConversations: number;
    avgConfidence: number;
    escalationRate: number;
    avgResponseTime: number;
    activeIntegrations: number;
    messagesGrowth: number;
    conversationsGrowth: number;
    confidenceGrowth: number;
    escalationGrowth: number;
    responseTimeGrowth: number;
    integrationsGrowth: number;
    conversationsByDay: Array<{ date: string; conversations: number; messages: number; escalations: number; }>;
    confidenceDistribution: Array<{ range: string; count: number; percentage: number; }>;
    responseTimeByHour: Array<{ hour: number; avgResponse: number; volume: number; }>;
    topSources: Array<{ source: string; queries: number; accuracy: number; }>;
};

export function AnalyticsContent() {
    const { tenantId } = useTenant();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSite, setSelectedSite] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState('30d');

    useEffect(() => {
        if (!tenantId) return;

        async function fetchAnalyticsData() {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (selectedSite) params.append('site', selectedSite);
                params.append('timeframe', timeRange);

                const response = await fetch(`/api/analytics?${params}`, {
                    headers: { 'x-tenant-id': tenantId }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch analytics data');
                }

                const analyticsData = await response.json();
                setData(analyticsData);
            } catch (error) {
                console.error('Error fetching analytics data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchAnalyticsData();
    }, [tenantId, selectedSite, timeRange]);

    if (loading) {
        return <AnalyticsSkeleton />;
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <i className="fa-duotone fa-solid fa-triangle-exclamation text-4xl text-warning mb-4" />
                    <h3 className="text-lg font-semibold text-base-content mb-2">Failed to load analytics</h3>
                    <p className="text-base-content/60">There was an error loading your analytics data.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Overview Metrics */}
            <div>
                <AnalyticsOverview data={data} />
            </div>

            {/* Site Filtering and Export Controls */}
            <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-end justify-between">
                <div className="flex-1">
                    <SiteFilter
                        selectedSite={selectedSite}
                        onSiteChange={setSelectedSite}
                    />
                </div>
                <div>
                    <ExportControls
                        selectedSite={selectedSite}
                        selectedRange={timeRange}
                    />
                </div>
            </div>

            {/* Integration Health Dashboard */}
            <div>
                <StaggerChild>
                    <IntegrationHealthDashboard />
                </StaggerChild>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <StaggerChild>
                    <ConversationTrendsChart data={data.conversationsByDay} />
                </StaggerChild>
                <StaggerChild>
                    <ConfidenceAnalysisChart data={data.confidenceDistribution} />
                </StaggerChild>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    <StaggerChild>
                        <ResponseTimeChart data={data.responseTimeByHour} />
                    </StaggerChild>
                </div>
                <div>
                    <StaggerChild>
                        <TopSourcesChart data={data.topSources} />
                    </StaggerChild>
                </div>
            </div>
        </div>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="space-y-8">
            {/* Overview metrics skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {Array.from({ length: 6 }, (_, i) => <StatCardSkeleton key={i} />)}
            </div>

            {/* Filter controls skeleton */}
            <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-end justify-between">
                <div className="flex-1">
                    <div className="h-10 bg-base-200 animate-pulse rounded-lg"></div>
                </div>
                <div>
                    <div className="h-10 w-32 bg-base-200 animate-pulse rounded-lg"></div>
                </div>
            </div>

            {/* Integration health skeleton */}
            <div className="bg-base-100 border border-base-300/40 rounded-lg p-6">
                <div className="h-6 w-48 bg-base-200 animate-pulse rounded mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="h-24 bg-base-200 animate-pulse rounded-lg"></div>
                    ))}
                </div>
            </div>

            {/* Charts skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <ChartSkeleton />
                <ChartSkeleton />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    <ChartSkeleton />
                </div>
                <div>
                    <ChartSkeleton />
                </div>
            </div>
        </div>
    );
}
