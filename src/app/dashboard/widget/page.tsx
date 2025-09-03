import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild } from "@/components/ui/animated-page";
import DefaultWidgetConfigurationWrapper from "@/components/default-widget-configuration-wrapper";
import StatCard from "@/components/ui/stat-card";

export const runtime = 'nodejs';


type WidgetStats = {
    total_interactions: number;
    active_deployments: number;
    messages_per_day: number;
    answer_quality_rate: number;
    high_confidence_count: number;
    low_confidence_count: number;
    total_messages: number;
    total_conversations: number;
};
// Removed unused Row type alias


async function getWidgetStats(tenantId: string): Promise<WidgetStats> {
    // Get active deployments (sites with the widget installed)
    const deploymentsResult = await query(
        `SELECT COUNT(*) as count FROM public.tenant_sites 
        WHERE tenant_id=$1 AND verified=true`,
        [tenantId]
    );

    // Get total interactions (messages sent to the widget)
    const interactionsResult = await query(
        `SELECT COUNT(*) as count FROM public.messages 
        WHERE tenant_id=$1 AND role='user'`,
        [tenantId]
    );

    // Get message count per day (activity trend)
    const messageFrequencyResult = await query(
        `SELECT COUNT(*) as count 
        FROM public.messages 
        WHERE tenant_id=$1 AND created_at > NOW() - INTERVAL '30 days'`,
        [tenantId]
    );

    // Get conversation stats - simplify since we don't have those fields
    const conversationStatsResult = await query(
        `SELECT 
            COUNT(*) as total_conversations
        FROM public.conversations
        WHERE tenant_id=$1`,
        [tenantId]
    );

    // Get count of messages by confidence level
    const confidenceStatsResult = await query(
        `SELECT 
            COUNT(*) as total_messages,
            SUM(CASE WHEN confidence < 0.55 THEN 1 ELSE 0 END) as low_confidence_count,
            SUM(CASE WHEN confidence >= 0.55 THEN 1 ELSE 0 END) as high_confidence_count
        FROM public.messages
        WHERE tenant_id=$1 AND role='assistant' AND confidence IS NOT NULL`,
        [tenantId]
    );

    const deployments = parseInt(deploymentsResult.rows[0]?.count || '0');
    const interactions = parseInt(interactionsResult.rows[0]?.count || '0');
    const messagesLast30Days = parseInt(messageFrequencyResult.rows[0]?.count || '0');

    // Calculate messages per day based on 30-day count
    const messagesPerDay = Math.round(messagesLast30Days / 30);

    const totalConversations = parseInt(conversationStatsResult.rows[0]?.total_conversations || '0');

    // Use confidence data from messages instead
    const totalMessages = parseInt(confidenceStatsResult.rows[0]?.total_messages || '0');
    const lowConfidenceCount = parseInt(confidenceStatsResult.rows[0]?.low_confidence_count || '0');
    const highConfidenceCount = parseInt(confidenceStatsResult.rows[0]?.high_confidence_count || '0');

    // Calculate answer quality rate - what percentage of messages had high confidence
    const answerQualityRate = totalMessages > 0
        ? Math.round((highConfidenceCount / totalMessages) * 100)
        : 0;

    return {
        total_interactions: interactions,
        active_deployments: deployments,
        messages_per_day: messagesPerDay,
        answer_quality_rate: answerQualityRate,
        high_confidence_count: highConfidenceCount,
        low_confidence_count: lowConfidenceCount,
        total_messages: totalMessages,
        total_conversations: totalConversations
    };
}

export default async function WidgetPage() {
    const tenantId = await getTenantIdStrict();
    const stats = await getWidgetStats(tenantId);

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Widget Settings", icon: "fa-comment-alt" }
    ];

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
                                <h1 className="text-3xl font-bold text-base-content">Widget Settings</h1>
                                <p className="text-base-content/60 mt-2">
                                    Configure your chat widget appearance, behavior, and integration
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <a href="/dashboard/sites" className="btn btn-outline rounded-xl">
                                    <i className="fa-duotone fa-solid fa-globe mr-2" aria-hidden />
                                    Manage Sites
                                </a>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Widget Stats */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                            <StatCard
                                title="Widget Engagement"
                                value={stats.total_interactions || 0}
                                icon="fa-message-bot"
                                color="primary"
                                description={stats.total_interactions === 1 ? "user interaction" : "user interactions"}
                            />

                            <StatCard
                                title="Messages Per Day"
                                value={stats.messages_per_day || 0}
                                icon="fa-bolt"
                                color="info"
                                description="daily average"
                            />

                            <StatCard
                                title="Answer Quality"
                                value={stats.answer_quality_rate ? `${stats.answer_quality_rate}%` : "N/A"}
                                icon="fa-chart-line-up"
                                color="success"
                                description="high confidence answers"
                            />

                            <StatCard
                                title="Active Deployments"
                                value={stats.active_deployments || 0}
                                icon="fa-globe-stand"
                                color="secondary"
                                description={stats.active_deployments === 1 ? "verified site" : "verified sites"}
                            />
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Additional Stats */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-2">
                            <StatCard
                                title="Total Messages"
                                value={stats.total_messages || 0}
                                icon="fa-comments"
                                color="success"
                                description="AI responses"
                            />

                            <StatCard
                                title="Total Conversations"
                                value={stats.total_conversations || 0}
                                icon="fa-messages"
                                color="warning"
                                description="chat sessions"
                            />

                            <StatCard
                                title="High Confidence"
                                value={stats.high_confidence_count || 0}
                                icon="fa-badge-check"
                                color="info"
                                description="confident responses"
                            />

                            <StatCard
                                title="Low Confidence"
                                value={stats.low_confidence_count || 0}
                                icon="fa-circle-exclamation"
                                color="error"
                                description="needs improvement"
                            />
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Widget Configuration */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-wand-magic-sparkles text-lg text-secondary" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-base-content">Widget Configuration</h2>
                                        <p className="text-base-content/60 text-sm">Customize the appearance and behavior of your chat widget</p>
                                    </div>
                                </div>

                                <div className="client-only">
                                    <DefaultWidgetConfigurationWrapper tenantId={tenantId} />
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Best Practices */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-info/10 rounded-2xl flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-lightbulb-on text-lg text-info" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-base-content">Best Practices</h2>
                                        <p className="text-base-content/60 text-sm">Tips for optimizing your chat widget</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <h3 className="font-medium text-base-content mb-2">
                                            <i className="fa-duotone fa-solid fa-palette mr-2 text-primary" aria-hidden />
                                            Match Your Brand
                                        </h3>
                                        <p className="text-sm text-base-content/70">
                                            Use your brand colors and style to make the widget feel like a natural part of your website.
                                            Choose a position that doesn&apos;t interfere with important UI elements.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <h3 className="font-medium text-base-content mb-2">
                                            <i className="fa-duotone fa-solid fa-message-smile mr-2 text-success" aria-hidden />
                                            Personalize Messaging
                                        </h3>
                                        <p className="text-sm text-base-content/70">
                                            Write a friendly welcome message that sets expectations for what the AI assistant can help with.
                                            Give your assistant a name that fits with your brand voice.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <h3 className="font-medium text-base-content mb-2">
                                            <i className="fa-duotone fa-solid fa-sitemap mr-2 text-warning" aria-hidden />
                                            Site-Specific Settings
                                        </h3>
                                        <p className="text-sm text-base-content/70">
                                            For multi-site setups, customize each widget&apos;s configuration to match the specific site&apos;s
                                            audience and purpose. Different sites may need different interaction styles.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <h3 className="font-medium text-base-content mb-2">
                                            <i className="fa-duotone fa-solid fa-book-open mr-2 text-info" aria-hidden />
                                            Better Knowledge Base
                                        </h3>
                                        <p className="text-sm text-base-content/70">
                                            The more quality content you add to your knowledge base, the better your AI assistant will be able to
                                            answer questions. Regularly review and update your content.
                                        </p>
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
