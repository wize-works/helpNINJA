"use client";

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { getChartColors } from '@/lib/colors';

interface FeedbackAnalyticsData {
    dailyVolume: Array<{
        date: string;
        feedback_count: number;
        bug_count: number;
        feature_request_count: number;
    }>;
    typeDistribution: Array<{
        type: string;
        count: number;
        percentage: number;
    }>;
    statusDistribution: Array<{
        status: string;
        count: number;
        percentage: number;
    }>;
    resolutionTimes: Array<{
        type: string;
        priority: string;
        avg_hours: number;
        resolved_count: number;
    }>;
}

// This function will be replaced by client-side API calls

interface FeedbackAnalyticsProps {
    tenantId: string;
}

export function FeedbackAnalytics({ tenantId }: FeedbackAnalyticsProps) {
    const colors = getChartColors();
    const [data, setData] = useState<FeedbackAnalyticsData>({
        dailyVolume: [],
        typeDistribution: [],
        statusDistribution: [],
        resolutionTimes: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const response = await fetch('/api/feedback/analytics');
                if (response.ok) {
                    const analyticsData = await response.json();
                    // Ensure data structure is properly initialized
                    setData({
                        dailyVolume: analyticsData.dailyVolume || [],
                        typeDistribution: analyticsData.typeDistribution || [],
                        statusDistribution: analyticsData.statusDistribution || [],
                        resolutionTimes: analyticsData.resolutionTimes || []
                    });
                }
            } catch (error) {
                console.error('Error fetching feedback analytics:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, [tenantId]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="bg-base-50 rounded-xl p-4">
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-base-300/60 rounded w-3/4"></div>
                            <div className="h-64 bg-base-300/60 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const formatDate = (dateString: unknown) => {
        if (!dateString || typeof dateString !== 'string') return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const formatType = (type: unknown) => {
        if (!type || typeof type !== 'string') return String(type || '');
        const typeLabels: Record<string, string> = {
            bug: 'Bug Reports',
            feature_request: 'Feature Requests',
            improvement: 'Improvements',
            ui_ux: 'UI/UX',
            performance: 'Performance',
            general: 'General'
        };
        return typeLabels[type] || type;
    };

    const formatStatus = (status: unknown) => {
        if (!status || typeof status !== 'string') return String(status || '');
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Colors for charts
    const typeColors = [colors.primary, colors.accent, colors.success, colors.warning, colors.error, colors.neutral];
    const statusColors: Record<string, string> = {
        open: '#3b82f6',
        in_review: '#f59e0b',
        planned: '#8b5cf6',
        in_progress: '#06b6d4',
        completed: '#10b981',
        rejected: '#ef4444',
        duplicate: '#6b7280'
    };

    if (data.dailyVolume.length === 0 && data.typeDistribution.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-duotone fa-solid fa-chart-bar text-2xl text-base-content/40" />
                </div>
                <h3 className="text-lg font-medium text-base-content mb-2">No analytics data yet</h3>
                <p className="text-base-content/60">
                    Analytics will appear once you start receiving feedback.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Volume Chart */}
            {data.dailyVolume.length > 0 && (
                <div className="bg-base-50 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-base-content mb-4">Daily Feedback Volume</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.dailyVolume}>
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.neutralContent} opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => formatDate(value)}
                                    stroke={colors.neutralContent}
                                    tick={{ fill: colors.neutralContent, opacity: 0.7 }}
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke={colors.neutralContent}
                                    tick={{ fill: colors.neutralContent, opacity: 0.7 }}
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={12} />
                                <Tooltip
                                    labelFormatter={(value) => formatDate(value)}
                                    contentStyle={{
                                        backgroundColor: colors.base100,
                                        border: `1px solid ${colors.neutral}`,
                                        borderRadius: '8px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="feedback_count"
                                    stroke={colors.primary}
                                    fill={colors.primary}
                                    fillOpacity={0.2}
                                    name="Total Feedback"
                                    connectNulls={true}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="bug_count"
                                    stroke={colors.error}
                                    fill={colors.error}
                                    fillOpacity={0.2}
                                    name="Bug Reports"
                                    connectNulls={true}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="feature_request_count"
                                    stroke={colors.success}
                                    fill={colors.success}
                                    fillOpacity={0.2}
                                    name="Feature Requests"
                                    connectNulls={true}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Type Distribution */}
            {data.typeDistribution.length > 0 && (
                <div className="bg-base-100 text-base-content rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">Feedback by Type</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.typeDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ type, percentage }) => `${formatType(type)}: ${percentage || 0}%`}
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="count"
                                    nameKey="type"
                                    strokeWidth={1}
                                    stroke={colors.base300}
                                >
                                    {data.typeDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`${typeColors[index % typeColors.length]}`} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [value, 'Count']}
                                    labelFormatter={(type) => formatType(type)}
                                    contentStyle={{
                                        color: colors.primary,
                                        backgroundColor: colors.base300,
                                        border: `1px solid ${colors.base300}`,
                                        borderRadius: '8px'
                                    }}
                                    itemStyle={{ color: colors.baseContent }}

                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Status Distribution */}
            {data.statusDistribution.length > 0 && (
                <div className="bg-base-50 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-base-content mb-4">Status Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.statusDistribution} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.baseContent} />
                                <XAxis
                                    stroke={colors.baseContent}
                                    fontSize={12}
                                    dataKey="status"
                                />
                                <YAxis
                                    //type="category"
                                    dataKey="count"
                                    tickFormatter={(value) => formatStatus(value)}
                                    stroke={colors.baseContent}
                                    fontSize={12}
                                    width={80}
                                />
                                <Legend />
                                <Tooltip
                                    formatter={(value) => [value, 'Count']}
                                    labelFormatter={(status) => formatStatus(status)}
                                    contentStyle={{
                                        color: colors.baseContent,
                                        backgroundColor: colors.base100,
                                        border: `1px solid ${colors.base300}`,
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill={colors.primary}
                                >
                                    {data.statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={statusColors[entry.status]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Resolution Times */}
            {data.resolutionTimes.length > 0 && (
                <div className="bg-base-100 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-base-content mb-4">Average Resolution Time</h3>
                    <div className="space-y-3">
                        {data.resolutionTimes.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-base-300 rounded-lg">
                                <div>
                                    <div className="font-medium text-base-content">
                                        {formatType(item.type)}
                                    </div>
                                    <div className={`text-sm ${item.priority === "medium" ? "text-warning/60" : item.priority === "high" ? "text-error/60" : item.priority === "critical" ? "text-error/60" : "text-info/60"}`}>
                                        {item.priority} priority • {item.resolved_count} resolved
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-base-content">
                                        {item.avg_hours < 1
                                            ? `${Math.round(item.avg_hours * 60)}m`
                                            : item.avg_hours < 24
                                                ? `${item.avg_hours}h`
                                                : `${Math.round(item.avg_hours / 24)}d`
                                        }
                                    </div>
                                    <div className="text-xs text-base-content/60">
                                        avg time
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
