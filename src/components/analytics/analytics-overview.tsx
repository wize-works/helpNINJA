"use client";

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

export function AnalyticsOverview({ data }: { data: AnalyticsData }) {
    const metrics = [
        {
            label: "Total Messages",
            value: data.totalMessages.toLocaleString(),
            trend: data.messagesGrowth,
            icon: "fa-messages",
            color: "blue"
        },
        {
            label: "Conversations",
            value: data.totalConversations.toLocaleString(),
            trend: data.conversationsGrowth,
            icon: "fa-comments",
            color: "green"
        },
        {
            label: "Avg Confidence",
            value: `${data.avgConfidence}%`,
            trend: data.confidenceGrowth,
            icon: "fa-gauge-high",
            color: "purple"
        },
        {
            label: "Escalation Rate",
            value: `${data.escalationRate}%`,
            trend: data.escalationGrowth,
            icon: "fa-triangle-exclamation",
            color: "orange"
        },
        {
            label: "Avg Response Time",
            value: `${data.avgResponseTime}s`,
            trend: data.responseTimeGrowth,
            icon: "fa-clock",
            color: "teal"
        },
        {
            label: "Active Integrations",
            value: data.activeIntegrations.toString(),
            trend: data.integrationsGrowth,
            icon: "fa-link",
            color: "indigo"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {metrics.map((metric, index) => (
                <div key={index} className="card bg-base-100 shadow">
                    <div className="card-body p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-base-content/70">{metric.label}</p>
                                <p className="text-2xl font-bold text-base-content mt-1">{metric.value}</p>
                            </div>
                            <div className={`w-12 h-12 rounded-lg bg-${metric.color}-100 flex items-center justify-center`}>
                                <i className={`fas ${metric.icon} text-${metric.color}-600 text-lg`}></i>
                            </div>
                        </div>
                        <div className="flex items-center mt-4">
                            <div className={`flex items-center space-x-1 ${metric.trend >= 0 ? 'text-success' : 'text-error'
                                }`}>
                                <i className={`fas ${metric.trend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-xs`}></i>
                                <span className="text-sm font-medium">
                                    {Math.abs(metric.trend).toFixed(1)}%
                                </span>
                            </div>
                            <span className="text-sm text-base-content/60 ml-2">vs last period</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
