"use client";

import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { getChartColors } from '@/lib/colors';

type ConversationTrendsData = {
    date: string;
    conversations: number;
    messages: number;
    escalations: number;
};

type ConfidenceDistributionData = {
    range: string;
    count: number;
    percentage: number;
};

type ResponseTimeData = {
    hour: number;
    avgResponse: number;
    volume: number;
};

// Custom tooltip component
interface TooltipProps {
    active?: boolean;
    payload?: Array<{
        color: string;
        name: string;
        value: number | string;
    }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-base-100/95 backdrop-blur-sm rounded-xl shadow-xl border border-base-200/60 p-4">
                <p className="text-sm font-semibold text-base-content mb-2">{label}</p>
                {payload.map((entry, index: number) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                        {entry.name === 'avgResponse' && 's'}
                        {entry.name === 'percentage' && '%'}
                    </p>
                ))}
            </div>
        );
    }
    return null;
}

export function ConversationTrendsChart({ data }: { data: ConversationTrendsData[] }) {
    const formattedData = data.map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    // Get theme-consistent colors
    const colors = getChartColors();

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="conversationsGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="messagesGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.success} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={colors.success} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="escalationsGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.warning} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={colors.warning} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.neutral} opacity={0.2} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: colors.neutral, opacity: 0.7 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: colors.neutral, opacity: 0.7 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="conversations"
                        name="Conversations"
                        stroke={colors.primary}
                        strokeWidth={2}
                        fill="url(#conversationsGradientAnalytics)"
                    />
                    <Area
                        type="monotone"
                        dataKey="messages"
                        name="Messages"
                        stroke={colors.success}
                        strokeWidth={2}
                        fill="url(#messagesGradientAnalytics)"
                    />
                    <Area
                        type="monotone"
                        dataKey="escalations"
                        name="Escalations"
                        stroke={colors.warning}
                        strokeWidth={2}
                        fill="url(#escalationsGradientAnalytics)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ConfidenceAnalysisChart({ data }: { data: ConfidenceDistributionData[] }) {
    // Get theme-consistent colors
    const colors = getChartColors();
    const COLORS = [colors.success, colors.primary, colors.warning, colors.error];

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill={colors.primary}
                        dataKey="percentage"
                        label={({ range, percentage }) => `${range}: ${percentage}%`}
                        labelLine={false}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ResponseTimeChart({ data }: { data: ResponseTimeData[] }) {
    const formattedData = data.map(item => ({
        ...item,
        hour: `${item.hour}:00`
    }));

    // Get theme-consistent colors
    const colors = getChartColors();

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.neutral} opacity={0.2} />
                    <XAxis
                        dataKey="hour"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: colors.neutral, opacity: 0.7 }}
                        interval={3}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: colors.neutral, opacity: 0.7 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                        dataKey="avgResponse"
                        name="Avg Response Time"
                        fill={colors.info}
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

type TopSourcesData = {
    source: string;
    queries: number;
    accuracy: number;
};

export function TopSourcesChart({ data }: { data: TopSourcesData[] }) {
    const colors = getChartColors();

    return (
        <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="horizontal"
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                        type="number"
                        stroke="#64748B"
                        fontSize={12}
                    />
                    <YAxis
                        type="category"
                        dataKey="source"
                        stroke="#64748B"
                        fontSize={12}
                        width={100}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "#F1F5F9", opacity: 0.1 }}
                    />
                    <Bar
                        dataKey="queries"
                        fill={colors.primary}
                        radius={[0, 4, 4, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// Charts are already exported with their function declarations
