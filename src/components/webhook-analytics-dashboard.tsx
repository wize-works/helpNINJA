"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from "@/components/tenant-context";
import StatCard from './ui/stat-card';

type WebhookAnalytics = {
    timeframe: string;
    generated_at: string;
    overview: {
        total_webhooks: number;
        active_webhooks: number;
        total_deliveries: number;
        successful_deliveries: number;
        failed_deliveries: number;
        success_rate: number;
    };
    daily_trends: Array<{
        date: string;
        total_deliveries: number;
        successful_deliveries: number;
        failed_deliveries: number;
    }>;
    event_breakdown: Array<{
        event_type: string;
        total_deliveries: number;
        successful_deliveries: number;
        failed_deliveries: number;
    }>;
    webhook_performance: Array<{
        id: string;
        name: string;
        url: string;
        is_active: boolean;
        total_deliveries: number;
        successful_deliveries: number;
        failed_deliveries: number;
    }>;
};

export function WebhookAnalyticsDashboard() {
    const { tenantId } = useTenant();
    const [analytics, setAnalytics] = useState<WebhookAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('7d');
    const [error, setError] = useState<string | null>(null);

    const loadAnalytics = useCallback(async () => {
        if (!tenantId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/webhooks/analytics?timeframe=${timeframe}`);

            if (!response.ok) {
                throw new Error('Failed to load webhook analytics');
            }

            const data = await response.json();
            setAnalytics(data);
        } catch (err) {
            console.error('Error loading webhook analytics:', err);
            setError(err instanceof Error ? err.message : 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [tenantId, timeframe]);

    useEffect(() => {
        loadAnalytics();
    }, [tenantId, timeframe, loadAnalytics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
                <button className="btn btn-sm rounded-lg" onClick={loadAnalytics}>Retry</button>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>No webhook analytics data available</span>
            </div>
        );
    }

    const { overview, daily_trends, event_breakdown, webhook_performance } = analytics;

    return (
        <div className="space-y-6">
            {/* Header with timeframe selector */}
            <div className="flex justify-between items-center">
                <div className="flex items-center justify-between mb-6">
                </div>
                <div className="flex gap-2">
                    {['1d', '7d', '30d', '90d'].map((period) => (
                        <button
                            key={period}
                            className={`btn btn-sm rounded-lg ${timeframe === period ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setTimeframe(period)}
                        >
                            {period === '1d' ? '24h' : period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="Total Webhooks"
                    value={overview.total_webhooks}
                    description={`${overview.active_webhooks} active`}
                    icon="fa-waveform-path"
                    color="primary"
                />

                <StatCard
                    title="Total Deliveries"
                    value={overview.total_deliveries}
                    description={`${overview.successful_deliveries} successful`}
                    icon="fa-paper-plane"
                    color="secondary"
                />

                <StatCard
                    title="Successful Deliveries"
                    value={overview.successful_deliveries}
                    description={`${overview.failed_deliveries} failed`}
                    icon="fa-check-circle"
                    color="success"
                />

                <StatCard
                    title="Success Rate"
                    value={`${overview.success_rate}%`}
                    description={`${overview.failed_deliveries} failures`}
                    icon="fa-thumbs-up"
                    color={overview.success_rate >= 95 ? 'success' : overview.success_rate >= 80 ? 'warning' : 'error'}
                />
            </div>

            {/* Daily Trends Chart */}
            <div className="card bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body">
                    <h3 className="card-title">Daily Delivery Trends</h3>
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Total</th>
                                    <th>Success</th>
                                    <th>Failed</th>
                                    <th>Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {daily_trends.map((day, index) => {
                                    const successRate = day.total_deliveries > 0
                                        ? Math.round((day.successful_deliveries / day.total_deliveries) * 100)
                                        : 100;

                                    return (
                                        <tr key={index}>
                                            <td>{new Date(day.date).toLocaleDateString()}</td>
                                            <td>{day.total_deliveries}</td>
                                            <td className="text-success">{day.successful_deliveries}</td>
                                            <td className="text-error">{day.failed_deliveries}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className={successRate >= 95 ? 'text-success' : successRate >= 80 ? 'text-warning' : 'text-error'}>
                                                        {successRate}%
                                                    </span>
                                                    <progress
                                                        className={`progress w-16 ${successRate >= 95 ? 'progress-success' : successRate >= 80 ? 'progress-warning' : 'progress-error'}`}
                                                        value={successRate}
                                                        max="100"
                                                    ></progress>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Event Type Breakdown */}
            <div className="card bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body">
                    <h3 className="card-title">Event Type Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {event_breakdown.map((event, index) => {
                            const successRate = event.total_deliveries > 0
                                ? Math.round((event.successful_deliveries / event.total_deliveries) * 100)
                                : 100;

                            return (
                                <div key={index} className="stat bg-base-200 rounded-lg">
                                    <div className="stat-title text-sm">{event.event_type}</div>
                                    <div className="stat-value text-lg">{event.total_deliveries}</div>
                                    <div className="stat-desc">
                                        <span className="text-success">{event.successful_deliveries}</span> /
                                        <span className="text-error ml-1">{event.failed_deliveries}</span>
                                        <div className="mt-1">
                                            <span className={successRate >= 95 ? 'text-success' : successRate >= 80 ? 'text-warning' : 'text-error'}>
                                                {successRate}% success
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Individual Webhook Performance */}
            <div className="card bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body">
                    <h3 className="card-title">Webhook Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>URL</th>
                                    <th>Status</th>
                                    <th>Deliveries</th>
                                    <th>Success Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {webhook_performance.map((webhook, index) => {
                                    const successRate = webhook.total_deliveries > 0
                                        ? Math.round((webhook.successful_deliveries / webhook.total_deliveries) * 100)
                                        : 100;

                                    return (
                                        <tr key={index}>
                                            <td className="font-medium">{webhook.name}</td>
                                            <td className="font-mono text-sm">{webhook.url}</td>
                                            <td>
                                                <div className={`badge ${webhook.is_active ? 'badge-success' : 'badge-error'}`}>
                                                    {webhook.is_active ? 'Active' : 'Inactive'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="text-center">
                                                    <div className="font-bold">{webhook.total_deliveries}</div>
                                                    <div className="text-sm opacity-70">
                                                        {webhook.successful_deliveries} / {webhook.failed_deliveries}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className={successRate >= 95 ? 'text-success' : successRate >= 80 ? 'text-warning' : 'text-error'}>
                                                        {successRate}%
                                                    </span>
                                                    <progress
                                                        className={`progress w-20 ${successRate >= 95 ? 'progress-success' : successRate >= 80 ? 'progress-warning' : 'progress-error'}`}
                                                        value={successRate}
                                                        max="100"
                                                    ></progress>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
