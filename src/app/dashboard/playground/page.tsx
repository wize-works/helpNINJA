"use client";

import { useState, useEffect } from 'react';
import { useTenant } from "@/components/tenant-context";
import QueryTester from "@/components/query-tester";
import SearchResultsViewer from "@/components/search-results-viewer";
import ConfidenceDisplay from "@/components/confidence-display";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import StatCard from '@/components/ui/stat-card';

type TestResult = {
    query: string;
    search_time_ms: number;
    curated_answers: Array<{
        id: string;
        question: string;
        answer: string;
        priority: number;
        keywords: string[];
        tags: string[];
        confidence: number;
        source: string;
    }>;
    rag_results: Array<{
        id: string;
        title: string;
        content: string;
        url: string;
        snippet: string;
        relevance_score: number;
        source: string;
    }>;
    ai_response?: {
        answer: string;
        confidence: number;
        response_time_ms: number;
        source: string;
        model?: string;
        tokens_used?: number;
        error?: string;
    };
    total_time_ms: number;
    metadata: {
        tenant_id: string;
        site_id?: string;
        timestamp: string;
        search_method: string;
        curated_count: number;
        document_count: number;
        ai_enabled: boolean;
    };
};

type Analytics = {
    knowledge_base: {
        total_documents: number;
        total_chunks: number;
        total_sites: number;
        total_curated_answers: number;
        recent_content_percentage: number;
    };
    conversations: {
        total_conversations: number;
        total_messages: number;
        avg_confidence: number;
        low_confidence_count: number;
        high_confidence_count: number;
    };
    performance: {
        health_score: number;
        health_grade: string;
        health_factors: string[];
    };
};

export default function PlaygroundPage() {
    const { tenantId } = useTenant();
    const [results, setResults] = useState<TestResult | null>(null);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Tools", href: "/dashboard", icon: "fa-wrench" },
        { label: "Playground", icon: "fa-flask" }
    ];

    useEffect(() => {
        if (tenantId) {
            loadAnalytics();
        }
    }, [tenantId]);

    const loadAnalytics = async () => {
        try {
            const response = await fetch('/api/playground/analytics', {
                // tenant derived server-side; no client headers
            });

            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    };

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-success';
        if (score >= 60) return 'text-warning';
        return 'text-error';
    };

    if (!tenantId) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Breadcrumb */}
                <StaggerContainer>
                    <StaggerChild>
                        <Breadcrumb items={breadcrumbItems} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Header */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-base-content">Knowledge Base Playground</h1>
                                <p className="text-base-content/60 mt-2">
                                    Test your knowledge base with real queries and analyze AI response quality
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <HoverScale scale={1.02}>
                                    <a href="/dashboard/analytics" className="btn btn-outline btn-sm rounded-lg">
                                        <i className="fa-duotone fa-solid fa-chart-line mr-2" aria-hidden />
                                        View Analytics
                                    </a>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Knowledge Base Overview */}
                {analytics && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                <HoverScale scale={1.01}>
                                    <StatCard
                                        title="Sites"
                                        value={analytics.knowledge_base.total_sites}
                                        description="Registered"
                                        icon="fa-globe"
                                        color="info"
                                    />
                                </HoverScale>
                                <HoverScale scale={1.01}>
                                    <StatCard
                                        title="Documents"
                                        value={analytics.knowledge_base.total_documents}
                                        description={`${analytics.knowledge_base.total_chunks} chunks`}
                                        icon="fa-file-text"
                                        color="primary"
                                    />
                                </HoverScale>

                                <HoverScale scale={1.01}>
                                    <StatCard
                                        title="Curated Answers"
                                        value={analytics.knowledge_base.total_curated_answers}
                                        description="Manual answers"
                                        icon="fa-star"
                                        color="secondary"
                                    />
                                </HoverScale>

                                <HoverScale scale={1.01}>
                                    <StatCard
                                        title="Recent Content"
                                        value={`${analytics.knowledge_base.recent_content_percentage}%`}
                                        description="added in last 30 days"
                                        icon="fa-clock-rotate-left"
                                        color="warning"
                                    />
                                </HoverScale>

                                <HoverScale scale={1.01}>
                                    <StatCard
                                        title="Avg. Confidence"
                                        value={analytics.conversations.avg_confidence.toFixed(1)}
                                        description="across all convos"
                                        icon="fa-gauge"
                                        color="secondary"
                                    />
                                </HoverScale>
                                <HoverScale scale={1.01}>
                                    <StatCard
                                        title="Conversations"
                                        value={analytics.conversations.total_conversations}
                                        description="total sessions"
                                        icon="fa-comments"
                                        color="info"
                                    />
                                </HoverScale>

                                <HoverScale scale={1.01}>
                                    <StatCard
                                        title="Low Confidence"
                                        value={analytics.conversations.low_confidence_count}
                                        description="below 50%"
                                        icon="fa-face-frown"
                                        color="error"
                                    />
                                </HoverScale>

                                <HoverScale scale={1.01}>
                                    <StatCard
                                        title="Health Score"
                                        value={analytics.performance.health_score}
                                        description={`Grade ${analytics.performance.health_grade}`}
                                        icon="fa-heart-pulse"
                                        color={analytics.performance.health_score >= 80 ? 'success' :
                                            analytics.performance.health_score >= 60 ? 'warning' : 'error'}
                                    />
                                </HoverScale>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )
                }

                {/* Query Tester */}
                <StaggerContainer>
                    <StaggerChild>
                        <QueryTester onResultsChange={setResults} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Results Display */}
                {
                    results && (
                        <StaggerContainer>
                            <StaggerChild>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* AI Response & Confidence */}
                                    <div className="lg:col-span-1 space-y-6">
                                        {/* AI Confidence */}
                                        {results.ai_response && !results.ai_response.error && (
                                            <div className="card bg-base-100 rounded-2xl shadow-sm">
                                                <div className="p-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                                            <i className="fa-duotone fa-solid fa-gauge text-primary" aria-hidden />
                                                        </div>
                                                        <h4 className="text-lg font-semibold text-base-content">Response Confidence</h4>
                                                    </div>
                                                    <ConfidenceDisplay
                                                        confidence={results.ai_response.confidence}
                                                        size="lg"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Performance Metrics */}
                                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                                            <div className="p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                                                        <i className="fa-duotone fa-solid fa-stopwatch text-secondary" aria-hidden />
                                                    </div>
                                                    <h4 className="text-lg font-semibold text-base-content">Performance</h4>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-base-content/70">Search Time:</span>
                                                        <span className="font-medium">{results.search_time_ms}ms</span>
                                                    </div>
                                                    {results.ai_response && (
                                                        <div className="flex justify-between">
                                                            <span className="text-base-content/70">AI Time:</span>
                                                            <span className="font-medium">{results.ai_response.response_time_ms}ms</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between border-t border-base-200/60 pt-2">
                                                        <span className="text-base-content/70">Total Time:</span>
                                                        <span className="font-semibold">{results.total_time_ms}ms</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Query Info */}
                                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                                            <div className="p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center">
                                                        <i className="fa-duotone fa-solid fa-info-circle text-info" aria-hidden />
                                                    </div>
                                                    <h4 className="text-lg font-semibold text-base-content">Query Details</h4>
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <div>
                                                        <span className="text-base-content/70">Method:</span>
                                                        <span className="ml-2 font-medium">{results.metadata.search_method}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-base-content/70">Timestamp:</span>
                                                        <span className="ml-2">{new Date(results.metadata.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    {results.metadata.site_id && (
                                                        <div>
                                                            <span className="text-base-content/70">Site:</span>
                                                            <span className="ml-2">{results.metadata.site_id.substring(0, 8)}...</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-base-content/70">AI Enabled:</span>
                                                        <span className="ml-2">{results.metadata.ai_enabled ? 'Yes' : 'No'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Search Results */}
                                    <div className="lg:col-span-2">
                                        <SearchResultsViewer
                                            curatedAnswers={results.curated_answers}
                                            ragResults={results.rag_results}
                                            query={results.query}
                                        />
                                    </div>
                                </div>
                            </StaggerChild>
                        </StaggerContainer>
                    )
                }

                {/* Help Section */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-lightbulb text-lg text-primary" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-base-content">How to Use the Playground</h2>
                                        <p className="text-base-content/60 text-sm">Testing and optimizing your knowledge base</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-search text-primary" aria-hidden />
                                            <h3 className="font-semibold">Test Queries</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70">
                                            Enter any question your customers might ask to see how your knowledge base responds. Test different phrasings and keywords.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-gauge text-primary" aria-hidden />
                                            <h3 className="font-semibold">Check Confidence</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70">
                                            Monitor confidence scores to identify gaps in your knowledge base. Low confidence suggests missing or unclear content.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-star text-primary" aria-hidden />
                                            <h3 className="font-semibold">Optimize Content</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70">
                                            Use insights to create curated answers for common questions and improve your document content for better responses.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            </div >
        </AnimatedPage >
    );
}
