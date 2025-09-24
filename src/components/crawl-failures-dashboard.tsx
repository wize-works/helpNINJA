'use client';

import { useState, useEffect, useCallback } from 'react';
import StatCard from '@/components/ui/stat-card';

interface CrawlAttempt {
    id: string;
    source_url: string;
    source_type: string;
    attempt_number: number;
    status: string;
    pages_found: number;
    pages_crawled: number;
    pages_failed: number;
    pages_skipped: number;
    error_type?: string;
    error_code?: number;
    error_message?: string;
    can_retry: boolean;
    created_at: string;
    completed_at?: string;
    duration_ms?: number;
    failures?: PageFailure[];
}

interface PageFailure {
    id: string;
    page_url: string;
    page_title?: string;
    error_type: string;
    error_code?: number;
    error_message: string;
    is_resolved: boolean;
    created_at: string;
}

interface FailureStats {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    retryableFailures: number;
    recentFailures: number;
    commonErrorTypes: { error_type: string; count: number }[];
}

interface CrawlFailuresDashboardProps {
    tenantId: string;
    siteId?: string;
}

export function CrawlFailuresDashboard({ tenantId, siteId }: CrawlFailuresDashboardProps) {
    const [attempts, setAttempts] = useState<CrawlAttempt[]>([]);
    const [stats, setStats] = useState<FailureStats | null>(null);
    const [pageFailures, setPageFailures] = useState<PageFailure[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<string | null>(null);
    const [resolving, setResolving] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('attempts');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch crawl attempts
            const params = new URLSearchParams({ tenantId });
            if (siteId) params.append('siteId', siteId);
            params.append('includeFailures', 'true');

            const [attemptsRes, statsRes, failuresRes] = await Promise.all([
                fetch(`/api/crawl-attempts?${params}`),
                fetch(`/api/crawl-attempts/stats?${params}`),
                fetch(`/api/page-failures?${params}&resolved=false`)
            ]);

            if (attemptsRes.ok) {
                const { attempts } = await attemptsRes.json();
                setAttempts(attempts);
            }

            if (statsRes.ok) {
                const stats = await statsRes.json();
                setStats(stats);
            }

            if (failuresRes.ok) {
                const { failures } = await failuresRes.json();
                setPageFailures(failures);
            }
        } catch (error) {
            console.error('Error fetching crawl data:', error);
        } finally {
            setLoading(false);
        }
    }, [tenantId, siteId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRetry = async (attemptId: string) => {
        try {
            setRetrying(attemptId);
            const response = await fetch('/api/crawl-attempts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'retry',
                    attemptId,
                    tenantId
                })
            });

            if (response.ok) {
                await fetchData(); // Refresh data
            } else {
                const error = await response.json();
                alert(`Retry failed: ${error.error}`);
            }
        } catch (error) {
            console.error('Error retrying crawl:', error);
            alert('Failed to retry crawl attempt');
        } finally {
            setRetrying(null);
        }
    };

    const handleResolveFailures = async (failureIds: string[]) => {
        try {
            setResolving(failureIds);
            const response = await fetch('/api/page-failures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'resolve',
                    failureIds,
                    tenantId,
                    resolvedBy: 'user', // In a real app, use actual user ID
                    notes: 'Marked as resolved from dashboard'
                })
            });

            if (response.ok) {
                await fetchData(); // Refresh data
            }
        } catch (error) {
            console.error('Error resolving failures:', error);
        } finally {
            setResolving([]);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            success: 'badge-success',
            failed: 'badge-error',
            pending: 'badge-warning',
            crawling: 'badge-info',
            skipped: 'badge-neutral'
        };

        const icons = {
            success: 'fa-check-circle',
            failed: 'fa-times-circle',
            pending: 'fa-clock',
            crawling: 'fa-spinner',
            skipped: 'fa-minus-circle'
        };

        const badgeClass = badges[status as keyof typeof badges] || 'badge-neutral';
        const icon = icons[status as keyof typeof icons] || 'fa-circle';

        return (
            <div className={`badge ${badgeClass} gap-1`}>
                <i className={`fa-solid fa-duotone ${icon}`} />
                {status}
            </div>
        );
    };

    const formatDuration = (ms?: number) => {
        if (!ms) return 'N/A';
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };

    if (loading) {
        return (
            <div className="card bg-base-100 rounded-2xl shadow-sm">
                <div className="card-body p-6">
                    <div className="flex items-center justify-center">
                        <span className="loading loading-spinner loading-md mr-2"></span>
                        Loading crawl data...
                    </div>
                </div>
            </div>
        );
    }

    const retryableAttempts = attempts.filter(a => a.status === 'failed' && a.can_retry);

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Attempts"
                        value={stats.totalAttempts}
                        description={`${stats.successfulAttempts} successful`}
                        icon="fa-list-check"
                        color="primary"
                    />

                    <StatCard
                        title="Failed Attempts"
                        value={stats.failedAttempts}
                        description={`${stats.retryableFailures} can retry`}
                        icon="fa-exclamation-triangle"
                        color="error"
                    />

                    <StatCard
                        title="Recent Failures"
                        value={stats.recentFailures}
                        description="Last 24 hours"
                        icon="fa-clock"
                        color="warning"
                    />

                    <StatCard
                        title="Success Rate"
                        value={stats.totalAttempts > 0
                            ? `${Math.round((stats.successfulAttempts / stats.totalAttempts) * 100)}%`
                            : '0%'}
                        description="Overall"
                        icon="fa-chart-line"
                        color="success"
                    />
                </div>
            )}

            {/* Quick Actions Alert */}
            {retryableAttempts.length > 0 && (
                <div className="alert alert-warning">
                    <i className="fa-solid fa-duotone fa-exclamation-triangle" />
                    <span>
                        You have {retryableAttempts.length} failed crawl attempt(s) that can be retried.
                    </span>
                </div>
            )}

            {/* Tabs */}
            <div className="card bg-base-100 rounded-2xl shadow-sm">
                <div className="card-body">
                    <div className="tabs tabs-bordered">
                        <button
                            className={`tab tab-bordered ${activeTab === 'attempts' ? 'tab-active' : ''}`}
                            onClick={() => setActiveTab('attempts')}
                        >
                            Crawl Attempts
                        </button>
                        <button
                            className={`tab tab-bordered ${activeTab === 'failures' ? 'tab-active' : ''}`}
                            onClick={() => setActiveTab('failures')}
                        >
                            Page Failures
                        </button>
                        <button
                            className={`tab tab-bordered ${activeTab === 'errors' ? 'tab-active' : ''}`}
                            onClick={() => setActiveTab('errors')}
                        >
                            Error Analysis
                        </button>
                    </div>

                    <div className="mt-6">
                        {activeTab === 'attempts' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Recent Crawl Attempts</h3>
                                    <button
                                        onClick={fetchData}
                                        className="btn btn-sm btn-outline rounded-xl"
                                        disabled={loading}
                                    >
                                        <i className={`fa-solid fa-duotone fa-rotate ${loading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </button>
                                </div>

                                {attempts.length === 0 ? (
                                    <div className="text-center py-12">
                                        <i className="fa-solid fa-duotone fa-inbox text-4xl text-base-content/20 mb-4" />
                                        <p className="text-base-content/60">No crawl attempts found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {attempts.map((attempt) => (
                                            <div key={attempt.id} className="border border-base-300 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        {getStatusBadge(attempt.status)}
                                                        <span className="font-medium truncate max-w-md text-sm">
                                                            {attempt.source_url}
                                                        </span>
                                                        <div className="badge badge-outline badge-sm">
                                                            Attempt #{attempt.attempt_number}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {attempt.status === 'failed' && attempt.can_retry && (
                                                            <button
                                                                onClick={() => handleRetry(attempt.id)}
                                                                disabled={retrying === attempt.id}
                                                                className="btn btn-sm btn-outline rounded-xl"
                                                            >
                                                                {retrying === attempt.id ? (
                                                                    <>
                                                                        <span className="loading loading-spinner loading-xs" />
                                                                        Retrying...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <i className="fa-solid fa-duotone fa-rotate" />
                                                                        Retry
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-base-content/70 mb-3">
                                                    <div>Found: {attempt.pages_found}</div>
                                                    <div>Crawled: {attempt.pages_crawled}</div>
                                                    <div>Failed: {attempt.pages_failed}</div>
                                                    <div>Duration: {formatDuration(attempt.duration_ms)}</div>
                                                </div>

                                                {attempt.error_message && (
                                                    <div className="alert alert-error alert-sm">
                                                        <i className="fa-solid fa-duotone fa-exclamation-triangle" />
                                                        <span className="text-sm">{attempt.error_message}</span>
                                                    </div>
                                                )}

                                                <div className="text-xs text-base-content/50 mt-2">
                                                    {new Date(attempt.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'failures' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Unresolved Page Failures</h3>

                                {pageFailures.length === 0 ? (
                                    <div className="text-center py-12">
                                        <i className="fa-solid fa-duotone fa-check-circle text-4xl text-success mb-4" />
                                        <p className="text-base-content/60">No unresolved page failures</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pageFailures.map((failure) => (
                                            <div key={failure.id} className="border border-base-300 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`badge badge-error gap-1`}>
                                                            <i className="fa-solid fa-duotone fa-times-circle" />
                                                            {failure.error_type}
                                                        </div>
                                                        <span className="font-medium truncate max-w-md text-sm">
                                                            {failure.page_title || failure.page_url}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleResolveFailures([failure.id])}
                                                        disabled={resolving.includes(failure.id)}
                                                        className="btn btn-sm btn-outline btn-success rounded-xl"
                                                    >
                                                        {resolving.includes(failure.id) ? (
                                                            <>
                                                                <span className="loading loading-spinner loading-xs" />
                                                                Resolving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fa-solid fa-duotone fa-check" />
                                                                Resolve
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <p className="text-sm text-base-content/70 mb-3">
                                                    {failure.page_url}
                                                </p>

                                                <div className="alert alert-error alert-sm">
                                                    <i className="fa-solid fa-duotone fa-exclamation-triangle" />
                                                    <span className="text-sm">
                                                        {failure.error_message}
                                                        {failure.error_code && ` (${failure.error_code})`}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-base-content/50 mt-2">
                                                    {new Date(failure.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'errors' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Error Analysis</h3>

                                {stats?.commonErrorTypes && stats.commonErrorTypes.length > 0 ? (
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-base-content/80">Most Common Error Types</h4>
                                        {stats.commonErrorTypes.map((error) => (
                                            <div key={error.error_type} className="flex items-center justify-between p-4 border border-base-300 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="badge badge-outline">{error.error_type}</div>
                                                    <span className="text-sm">{error.count} occurrences</span>
                                                </div>
                                                <div className="text-sm text-base-content/60">
                                                    {Math.round((error.count / (stats.failedAttempts || 1)) * 100)}% of failures
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <i className="fa-solid fa-duotone fa-chart-bar text-4xl text-base-content/20 mb-4" />
                                        <p className="text-base-content/60">No error data available</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}