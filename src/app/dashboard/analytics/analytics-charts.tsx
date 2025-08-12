"use client";

import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

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

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="conversationsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="escalationsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--bc) / 0.1)" />
                    <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--bc) / 0.6)' }}
                    />
                    <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--bc) / 0.6)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="conversations"
                        name="Conversations"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#conversationsGradient)"
                    />
                    <Area
                        type="monotone"
                        dataKey="messages"
                        name="Messages"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#messagesGradient)"
                    />
                    <Area
                        type="monotone"
                        dataKey="escalations"
                        name="Escalations"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#escalationsGradient)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ConfidenceAnalysisChart({ data }: { data: ConfidenceDistributionData[] }) {
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
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

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--bc) / 0.1)" />
                    <XAxis 
                        dataKey="hour" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--bc) / 0.6)' }}
                        interval={3}
                    />
                    <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--bc) / 0.6)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                        dataKey="avgResponse" 
                        name="Avg Response Time"
                        fill="#06b6d4"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// Charts are already exported with their function declarations
