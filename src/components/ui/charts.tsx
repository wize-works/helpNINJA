"use client";

import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { HoverScale } from './animated-page';
import { getChartColors } from '@/lib/colors';

// Time range options
export const timeRanges = [
    { key: '7d', label: '7 days', days: 7 },
    { key: '30d', label: '30 days', days: 30 },
    { key: '90d', label: '90 days', days: 90 },
    { key: '1y', label: '1 year', days: 365 },
] as const;

export type TimeRange = typeof timeRanges[number]['key'];

// Time Range Selector Component
export function TimeRangeSelector({
    selected,
    onSelect,
    className = ""
}: {
    selected: TimeRange;
    onSelect: (range: TimeRange) => void;
    className?: string;
}) {
    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {timeRanges.map((range) => (
                <HoverScale key={range.key} scale={1.02}>
                    <button
                        onClick={() => onSelect(range.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${selected === range.key
                            ? 'bg-primary text-primary-content shadow-sm'
                            : 'bg-base-200/60 hover:bg-base-200 border border-base-300/40 text-base-content/80 hover:text-base-content'
                            }`}
                    >
                        {range.label}
                    </button>
                </HoverScale>
            ))}
        </div>
    );
}

// Custom tooltip that matches our theme
interface TooltipProps {
    active?: boolean;
    payload?: Array<{
        color: string;
        name: string;
        value: number;
    }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-base-100/95 backdrop-blur-sm border border-base-200/60 rounded-xl p-4 shadow-xl">
                <p className="text-sm font-semibold text-base-content mb-2">{label}</p>
                {payload.map((entry, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-base-content/80">{entry.name}</span>
                        </div>
                        <span className="font-semibold" style={{ color: entry.color }}>
                            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

// Enhanced Chat volume chart with better styling
export function ChatVolumeChart({
    data,
    loading = false
}: {
    data: Array<{ date: string; messages: number; conversations: number }>;
    loading?: boolean;
}) {
    if (loading) {
        return (
            <div className="w-full h-64 flex items-center justify-center">
                <div className="animate-pulse text-base-content/60">Loading chart data...</div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-64 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mb-3">
                    <i className="fa-duotone fa-solid fa-chart-line text-2xl text-base-content/40" aria-hidden />
                </div>
                <p className="text-base-content/60 text-sm">No chat data available</p>
                <p className="text-base-content/40 text-xs mt-1">Start conversations to see analytics</p>
            </div>
        );
    }

    const maxMessages = Math.max(...data.map(d => d.messages));
    const maxConversations = Math.max(...data.map(d => d.conversations));
    const hasData = maxMessages > 0 || maxConversations > 0;

    if (!hasData) {
        return (
            <div className="w-full h-64 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mb-3">
                    <i className="fa-duotone fa-solid fa-messages text-2xl text-base-content/40" aria-hidden />
                </div>
                <p className="text-base-content/60 text-sm">No activity in this period</p>
                <p className="text-base-content/40 text-xs mt-1">Chat volume will appear here once you have conversations</p>
            </div>
        );
    }

    // Get theme-consistent colors
    const colors = getChartColors();

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                    <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.primary} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={colors.primary} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="conversationsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.secondary} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={colors.secondary} stopOpacity={0.05} />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.neutralContent}
                    opacity={0.3}
                />
                <XAxis
                    dataKey="date"
                    stroke={colors.neutralContent}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: colors.neutralContent, opacity: 0.7 }}
                />
                <YAxis
                    stroke={colors.neutralContent}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: colors.neutralContent, opacity: 0.7 }}
                    width={30}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey="messages"
                    stroke={colors.primary}
                    fillOpacity={1}
                    fill="url(#messagesGradient)"
                    strokeWidth={2.5}
                    name="Messages"
                    dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: colors.primary, strokeWidth: 2, fill: colors.primary }}
                />
                <Area
                    type="monotone"
                    dataKey="conversations"
                    stroke={colors.secondary}
                    fillOpacity={1}
                    fill="url(#conversationsGradient)"
                    strokeWidth={2.5}
                    name="Conversations"
                    dot={{ fill: colors.secondary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: colors.secondary, strokeWidth: 2, fill: colors.secondary }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// Enhanced Sources bar chart
export function SourcesChart({
    data,
    loading = false
}: {
    data: Array<{ name: string; documents: number; chunks: number }>;
    loading?: boolean;
}) {
    if (loading) {
        return (
            <div className="w-full h-48 flex items-center justify-center">
                <div className="animate-pulse text-base-content/60">Loading sources...</div>
            </div>
        );
    }

    if (!data || data.length === 0 || (data.length === 1 && data[0].name === 'No sources yet')) {
        return (
            <div className="w-full h-48 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mb-3">
                    <i className="fa-duotone fa-solid fa-database text-xl text-base-content/40" aria-hidden />
                </div>
                <p className="text-base-content/60 text-sm">No sources indexed</p>
                <p className="text-base-content/40 text-xs mt-1">Import documents to see source analytics</p>
            </div>
        );
    }

    // Filter out empty sources
    const validData = data.filter(d => d.documents > 0 || d.chunks > 0);

    if (validData.length === 0) {
        return (
            <div className="w-full h-48 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mb-3">
                    <i className="fa-duotone fa-solid fa-folder-open text-xl text-base-content/40" aria-hidden />
                </div>
                <p className="text-base-content/60 text-sm">No data in sources</p>
                <p className="text-base-content/40 text-xs mt-1">Process some documents to see the breakdown</p>
            </div>
        );
    }

    // Get theme-consistent colors
    const colors = getChartColors();

    // Sort by document count (descending) and limit to 5 entries for better display
    const sortedData = [...validData]
        .sort((a, b) => b.documents - a.documents || b.chunks - a.chunks)
        .slice(0, 5)
        .map(item => {
            // Fix any invalid regex capture that might still come through
            let displayName = item.name;

            // Fix the "\\1" issue - replace with better label
            if (displayName === "\\1") {
                displayName = "All Documents";
            }

            // Ensure name isn't too long for display
            displayName = displayName.length > 20 ? displayName.substring(0, 18) + '...' : displayName;

            return {
                ...item,
                name: displayName
            };
        });

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis
                    //type="number"
                    dataKey="name"
                    stroke={colors.neutralContent}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: colors.neutralContent, opacity: 0.7 }}
                />
                <YAxis
                    //type="category"
                    //dataKey="name"
                    stroke={colors.secondary}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: colors.neutralContent, opacity: 0.7 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={colors.neutralContent}
                    opacity={0.3}
                />
                <Bar
                    dataKey="documents"
                    fill={colors.primary}
                    barSize={20}
                    radius={[0, 6, 6, 0]}
                    name="Documents"
                    animationDuration={1000}
                />
                <Bar
                    dataKey="chunks"
                    fill={colors.secondary}
                    barSize={20}
                    radius={[0, 6, 6, 0]}
                    name="Chunks"
                    animationDuration={1000}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

// Confidence distribution pie chart
export function ConfidenceChart({
    data,
    loading = false
}: {
    data: Array<{ name: string; value: number; color: string }>;
    loading?: boolean;
}) {

    const colors = getChartColors();

    if (loading) {
        return (
            <div className="w-full h-48 flex items-center justify-center">
                <div className="animate-pulse text-base-content/60">Loading confidence data...</div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-48 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mb-3">
                    <i className="fa-duotone fa-solid fa-chart-pie text-xl text-base-content/40" aria-hidden />
                </div>
                <p className="text-base-content/60 text-sm">No confidence data</p>
                <p className="text-base-content/40 text-xs mt-1">Confidence analytics will appear after conversations</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Legend verticalAlign='top' />
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={2}
                    stroke={colors.base100}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`${entry.color}`} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
            </PieChart>
        </ResponsiveContainer>
    );
}

// Enhanced metric trend component
export function MetricTrend({
    value,
    previousValue,
    label,
    showIcon = true,
    className = ""
}: {
    value: number;
    previousValue: number;
    label: string;
    showIcon?: boolean;
    className?: string;
}) {
    const trend = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0;
    const isPositive = trend > 0;
    const isNeutral = Math.abs(trend) < 1;

    return (
        <div className={`flex items-center gap-1.5 text-sm ${className}`}>
            {!isNeutral && showIcon && (
                <div className={`flex items-center gap-1 ${isPositive ? 'text-success' : 'text-error'}`}>
                    <i className={`fa-duotone fa-solid ${isPositive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-xs`} aria-hidden />
                    <span className="font-medium">{Math.abs(trend).toFixed(1)}%</span>
                </div>
            )}
            {isNeutral && showIcon && (
                <div className="flex items-center gap-1 text-base-content/60">
                    <i className="fa-duotone fa-solid fa-minus text-xs" aria-hidden />
                    <span className="font-medium">0%</span>
                </div>
            )}
            <span className="text-base-content/60">{label}</span>
        </div>
    );
} 