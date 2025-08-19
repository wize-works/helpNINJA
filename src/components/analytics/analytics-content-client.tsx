"use client";

import { useState } from "react";
import { StaggerChild } from "@/components/ui/animated-page";
import { IntegrationHealthDashboard } from "@/components/analytics/integration-health-dashboard";
import { ExportControls } from "@/components/analytics/export-controls";
import { SiteFilter } from "@/components/analytics/site-filter";
import { ChartSkeleton } from "@/components/ui/skeleton";

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
    conversationsByDay: Array<{ date: string; conversations: number; messages: number; }>;
    confidenceDistribution: Array<{ range: string; count: number; percentage: number; }>;
    responseTimeByHour: Array<{ hour: number; avgTime: number; count: number; }>;
    topSources: Array<{ source: string; count: number; percentage: number; }>;
};

// Import the card components from the page
type ConversationTrendsData = Array<{ date: string; conversations: number; messages: number; }>;
type ConfidenceDistributionData = Array<{ range: string; count: number; percentage: number; }>;
type ResponseTimeData = Array<{ hour: number; avgTime: number; count: number; }>;
type TopSourcesData = Array<{ source: string; count: number; percentage: number; }>;

interface AnalyticsClientProps {
    initialData: AnalyticsData;
    AnalyticsOverview: React.ComponentType<{ data: AnalyticsData }>;
    ConversationTrendsCard: React.ComponentType<{ data: ConversationTrendsData }>;
    ConfidenceAnalysisCard: React.ComponentType<{ data: ConfidenceDistributionData }>;
    ResponseTimeCard: React.ComponentType<{ data: ResponseTimeData }>;
    TopSourcesCard: React.ComponentType<{ data: TopSourcesData }>;
}

export function AnalyticsContentClient({
    initialData,
    AnalyticsOverview,
    ConversationTrendsCard,
    ConfidenceAnalysisCard,
    ResponseTimeCard,
    TopSourcesCard
}: AnalyticsClientProps) {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [selectedSite, setSelectedSite] = useState<string | null>(null);
    const [timeRange] = useState('30d');

    const handleSiteChange = async (siteId: string | null) => {
        setSelectedSite(siteId);
        setLoading(true);

        try {
            const params = new URLSearchParams();
            if (siteId) params.append('site', siteId);
            params.append('timeframe', timeRange);

            const response = await fetch(`/api/analytics?${params}`);

            if (response.ok) {
                const newData = await response.json();
                setData(newData);
            }
        } catch (error) {
            console.error('Error fetching filtered analytics:', error);
        } finally {
            setLoading(false);
        }
    };

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
                        onSiteChange={handleSiteChange}
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
            {loading ? (
                <div className="space-y-8">
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
            ) : (
                <>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <StaggerChild>
                            <ConversationTrendsCard data={data.conversationsByDay} />
                        </StaggerChild>
                        <StaggerChild>
                            <ConfidenceAnalysisCard data={data.confidenceDistribution} />
                        </StaggerChild>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2">
                            <StaggerChild>
                                <ResponseTimeCard data={data.responseTimeByHour} />
                            </StaggerChild>
                        </div>
                        <div>
                            <StaggerChild>
                                <TopSourcesCard data={data.topSources} />
                            </StaggerChild>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
