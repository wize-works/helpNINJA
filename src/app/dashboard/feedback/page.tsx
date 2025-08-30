import { Suspense } from 'react';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { query } from '@/lib/db';
import { AnimatedPage, StaggerContainer, StaggerChild } from '@/components/ui/animated-page';
import { FeedbackTable } from '@/components/feedback-table';
import { FeedbackAnalytics } from '@/components/feedback-analytics';
import { FeedbackFilters } from '@/components/feedback-filters';
import StatCard from '@/components/ui/stat-card';
import { DashboardFeedbackButton } from '@/components/feedback-button';

interface FeedbackOverviewStats {
    totalFeedback: number;
    feedbackLast30Days: number;
    pendingFeedback: number;
    completedFeedback: number;
    averageResolutionHours: number;
    escalatedFeedback: number;
    feedbackWithContact: number;
    topFeedbackType: string;
}

async function getFeedbackStats(tenantId: string): Promise<FeedbackOverviewStats> {
    try {
        const { rows } = await query(`
            SELECT 
                COUNT(*) as total_feedback,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as feedback_last_30_days,
                COUNT(*) FILTER (WHERE status IN ('open', 'in_review')) as pending_feedback,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_feedback,
                ROUND(AVG(EXTRACT(epoch FROM (resolved_at - created_at))/3600)::numeric, 1) as avg_resolution_hours,
                COUNT(*) FILTER (WHERE escalated_at IS NOT NULL) as escalated_feedback,
                COUNT(*) FILTER (WHERE user_email IS NOT NULL OR contact_value IS NOT NULL) as feedback_with_contact
            FROM public.feedback
            WHERE tenant_id = $1
        `, [tenantId]);

        // Get top feedback type in a separate query
        const { rows: typeRows } = await query(`
            SELECT type
            FROM public.feedback
            WHERE tenant_id = $1
            GROUP BY type
            ORDER BY COUNT(*) DESC
            LIMIT 1
        `, [tenantId]);

        return {
            totalFeedback: parseInt(rows[0]?.total_feedback || '0'),
            feedbackLast30Days: parseInt(rows[0]?.feedback_last_30_days || '0'),
            pendingFeedback: parseInt(rows[0]?.pending_feedback || '0'),
            completedFeedback: parseInt(rows[0]?.completed_feedback || '0'),
            averageResolutionHours: parseFloat(rows[0]?.avg_resolution_hours || '0'),
            escalatedFeedback: parseInt(rows[0]?.escalated_feedback || '0'),
            feedbackWithContact: parseInt(rows[0]?.feedback_with_contact || '0'),
            topFeedbackType: typeRows[0]?.type || 'general'
        };
    } catch (error) {
        console.error('Error fetching feedback stats:', error);
        return {
            totalFeedback: 0,
            feedbackLast30Days: 0,
            pendingFeedback: 0,
            completedFeedback: 0,
            averageResolutionHours: 0,
            escalatedFeedback: 0,
            feedbackWithContact: 0,
            topFeedbackType: 'general'
        };
    }
}

interface FeedbackOverviewProps {
    tenantId: string;
}

async function FeedbackOverview({ tenantId }: FeedbackOverviewProps) {
    const stats = await getFeedbackStats(tenantId);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard
                title="Total Feedback"
                value={stats.totalFeedback.toString()}
                subtitle={`${stats.feedbackLast30Days} this month`}
                icon="fa-comments"
                color="primary"
                className="hover:scale-[1.02] transition-transform duration-200"
            />
            
            <StatCard
                title="Pending Items"
                value={stats.pendingFeedback.toString()}
                subtitle={`${stats.escalatedFeedback} escalated`}
                icon="fa-clock"
                color={stats.pendingFeedback > 10 ? "warning" : "info"}
                className="hover:scale-[1.02] transition-transform duration-200"
            />
            
            <StatCard
                title="Resolved"
                value={stats.completedFeedback.toString()}
                subtitle={stats.averageResolutionHours > 0 ? `~${stats.averageResolutionHours}h avg` : 'No data yet'}
                icon="fa-check-circle"
                color="success"
                className="hover:scale-[1.02] transition-transform duration-200"
            />
            
            <StatCard
                title="Contact Rate"
                value={stats.totalFeedback > 0 ? `${Math.round((stats.feedbackWithContact / stats.totalFeedback) * 100)}%` : '0%'}
                subtitle={`${stats.feedbackWithContact} provided contact`}
                icon="fa-address-card"
                color="secondary"
                className="hover:scale-[1.02] transition-transform duration-200"
            />
        </div>
    );
}

function FeedbackOverviewSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="bg-base-100 rounded-2xl p-6 shadow-sm">
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-base-300/60 rounded w-3/4"></div>
                        <div className="h-8 bg-base-300/60 rounded w-1/2"></div>
                        <div className="h-3 bg-base-300/60 rounded w-2/3"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default async function FeedbackPage() {
    const tenantId = await getTenantIdStrict();

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Header Section */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">User Feedback</h1>
                                <p className="text-base-content/60 mt-1">
                                    Manage and analyze user feedback, feature requests, and bug reports
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <DashboardFeedbackButton 
                                    tenantId={tenantId}
                                    variant="outline"
                                    className="btn-sm"
                                />
                                <button className="btn btn-primary btn-sm">
                                    <i className="fa-duotone fa-solid fa-download" />
                                    Export CSV
                                </button>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Overview Stats */}
                <StaggerContainer>
                    <StaggerChild>
                        <Suspense fallback={<FeedbackOverviewSkeleton />}>
                            <FeedbackOverview tenantId={tenantId} />
                        </Suspense>
                    </StaggerChild>
                </StaggerContainer>

                {/* Analytics Section */}
                <StaggerContainer>
                    <StaggerChild>
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
                    </StaggerChild>
                </StaggerContainer>

                {/* Feedback Management */}
                <StaggerContainer>
                    <StaggerChild>
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
                                        <div className="badge badge-primary badge-sm">
                                            <i className="fa-duotone fa-solid fa-sparkles text-xs mr-1" />
                                            Auto-escalation enabled
                                        </div>
                                    </div>
                                </div>

                                {/* Filters */}
                                <div className="mb-6">
                                    <Suspense fallback={
                                        <div className="flex gap-4">
                                            <div className="h-10 bg-base-200/60 rounded w-32 animate-pulse"></div>
                                            <div className="h-10 bg-base-200/60 rounded w-24 animate-pulse"></div>
                                            <div className="h-10 bg-base-200/60 rounded w-28 animate-pulse"></div>
                                        </div>
                                    }>
                                        <FeedbackFilters />
                                    </Suspense>
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
                    </StaggerChild>
                </StaggerContainer>

                {/* Help Section */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-gradient-to-r from-info/10 to-primary/10 border border-info/20 rounded-2xl">
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-info/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <i className="fa-duotone fa-solid fa-lightbulb text-lg text-info" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-base-content mb-2">Feedback Tips</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-base-content/80">
                                            <div className="space-y-2">
                                                <p className="flex items-start gap-2">
                                                    <i className="fa-duotone fa-solid fa-bolt text-warning text-xs mt-1" />
                                                    <span><strong>Urgent feedback</strong> is automatically escalated to your configured integrations</span>
                                                </p>
                                                <p className="flex items-start gap-2">
                                                    <i className="fa-duotone fa-solid fa-envelope text-primary text-xs mt-1" />
                                                    <span><strong>Contact information</strong> helps you follow up on valuable feedback</span>
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="flex items-start gap-2">
                                                    <i className="fa-duotone fa-solid fa-tags text-secondary text-xs mt-1" />
                                                    <span><strong>Categories and tags</strong> help organize feedback for better insights</span>
                                                </p>
                                                <p className="flex items-start gap-2">
                                                    <i className="fa-duotone fa-solid fa-chart-line text-success text-xs mt-1" />
                                                    <span><strong>Analytics show trends</strong> to guide product improvements</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}
