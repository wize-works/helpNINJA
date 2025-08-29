import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, FadeIn } from "@/components/ui/animated-page";
import Link from "next/link";
import { notFound } from "next/navigation";

export const runtime = 'nodejs';

type IntegrationDetails = {
    id: string;
    tenant_id: string;
    provider: string;
    name: string;
    status: 'active' | 'disabled' | 'error';
    credentials: Record<string, unknown>;
    config: Record<string, unknown>;
    created_at: string;
    updated_at: string;
};

type EscalationActivity = {
    id: string;
    status: 'sent' | 'pending' | 'failed';
    provider: string;
    attempts: number;
    last_error: string | null;
    created_at: string;
    sent_at: string | null;
};

async function getIntegration(tenantId: string, integrationId: string): Promise<IntegrationDetails | null> {
    const { rows } = await query<IntegrationDetails>(
        `SELECT * FROM public.integrations WHERE tenant_id = $1 AND id = $2`,
        [tenantId, integrationId]
    );
    return rows[0] || null;
}

async function getRecentActivity(tenantId: string, integrationId: string): Promise<EscalationActivity[]> {
    const { rows } = await query<EscalationActivity>(
        `SELECT id, status, provider, attempts, last_error, created_at, sent_at
         FROM public.integration_outbox 
         WHERE tenant_id = $1 AND integration_id = $2 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [tenantId, integrationId]
    );
    return rows;
}

function getProviderIcon(provider: string) {
    switch (provider) {
        case 'slack': return 'fa-brands fa-slack';
        case 'email': return 'fa-duotone fa-solid fa-envelope';
        case 'teams': return 'fa-brands fa-microsoft';
        case 'discord': return 'fa-brands fa-discord';
        default: return 'fa-duotone fa-solid fa-plug';
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'active': return { class: 'badge-success', text: 'Active' };
        case 'disabled': return { class: 'badge-warning', text: 'Disabled' };
        case 'error': return { class: 'badge-error', text: 'Error' };
        default: return { class: 'badge-ghost', text: status };
    }
}

function getActivityStatus(activity: EscalationActivity): { class: string; text: string; icon: string } {
    switch (activity.status) {
        case 'sent':
            return { 
                class: 'badge-success', 
                text: 'Sent', 
                icon: 'fa-check-circle text-success' 
            };
        case 'failed':
            return { 
                class: 'badge-error', 
                text: 'Failed', 
                icon: 'fa-exclamation-circle text-error' 
            };
        case 'pending':
        default:
            return { 
                class: 'badge-warning', 
                text: 'Pending', 
                icon: 'fa-clock text-warning' 
            };
    }
}

function ConfigDisplay({ config, title }: { config: Record<string, unknown>; title: string }) {
    const configEntries = Object.entries(config);
    
    if (configEntries.length === 0) {
        return (
            <div className="text-base-content/60 text-sm">
                No {title.toLowerCase()} configured
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {configEntries.map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-base-200 last:border-b-0">
                    <span className="text-sm font-medium text-base-content/80 capitalize">
                        {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-base-content/60 font-mono">
                        {key.toLowerCase().includes('url') || key.toLowerCase().includes('webhook') 
                            ? String(value).substring(0, 50) + '...'
                            : String(value)
                        }
                    </span>
                </div>
            ))}
        </div>
    );
}

export default async function IntegrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const tenantId = await getTenantIdStrict();
    const { id } = await params;
    
    const integration = await getIntegration(tenantId, id);
    
    if (!integration) {
        notFound();
    }

    const recentActivity = await getRecentActivity(tenantId, id);
    const statusBadge = getStatusBadge(integration.status);

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Integrations", href: "/dashboard/integrations", icon: "fa-plug" },
        { label: integration.name, icon: "fa-eye" }
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
                <FadeIn>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                                <i className={`${getProviderIcon(integration.provider)} text-2xl text-primary`} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">{integration.name}</h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-base-content/60 capitalize">{integration.provider} Integration</span>
                                    <span className={`badge ${statusBadge.class} badge-sm`}>
                                        {statusBadge.text}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <Link
                                href={`/dashboard/integrations/${integration.id}/settings`}
                                className="btn btn-outline btn-primary rounded-xl"
                            >
                                <i className="fa-duotone fa-solid fa-cog mr-2" />
                                Settings
                            </Link>
                            <Link
                                href="/dashboard/integrations"
                                className="btn btn-ghost rounded-xl"
                            >
                                <i className="fa-duotone fa-solid fa-arrow-left mr-2" />
                                Back
                            </Link>
                        </div>
                    </div>
                </FadeIn>

                {/* Main Content */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Column - Configuration Details */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Configuration */}
                        <StaggerChild>
                            <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-200">
                                <div className="card-body p-6">
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <i className="fa-duotone fa-solid fa-cogs text-primary" />
                                        Configuration
                                    </h3>
                                    <ConfigDisplay config={integration.config} title="Configuration" />
                                </div>
                            </div>
                        </StaggerChild>

                        {/* Recent Activity */}
                        <StaggerChild>
                            <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-200">
                                <div className="card-body p-6">
                                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <i className="fa-duotone fa-solid fa-clock text-primary" />
                                        Recent Escalations
                                    </h3>
                                    
                                    {recentActivity.length > 0 ? (
                                        <div className="space-y-3">
                                            {recentActivity.map((activity) => {
                                                const activityStatus = getActivityStatus(activity);
                                                return (
                                                    <div key={activity.id} className="flex items-center justify-between p-3 bg-base-200/40 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <i className={`fa-duotone fa-solid ${activityStatus.icon}`} />
                                                            <div>
                                                                <div className="font-medium text-sm">
                                                                    Escalation to {activity.provider}
                                                                </div>
                                                                <div className="text-xs text-base-content/60">
                                                                    {new Date(activity.created_at).toLocaleString()}
                                                                    {activity.attempts > 1 && (
                                                                        <span className="ml-2 text-warning">
                                                                            • {activity.attempts} attempts
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {activity.last_error && (
                                                                    <div className="text-xs text-error mt-1 font-mono">
                                                                        {activity.last_error}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`badge ${activityStatus.class} badge-sm`}>
                                                                {activityStatus.text}
                                                            </div>
                                                            {activity.sent_at && (
                                                                <div className="text-xs text-success mt-1">
                                                                    Sent: {new Date(activity.sent_at).toLocaleString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                                                <i className="fa-duotone fa-solid fa-inbox text-xl text-base-content/40" />
                                            </div>
                                            <p className="text-base-content/60">No recent escalation activity</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </StaggerChild>
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Info */}
                        <StaggerChild>
                            <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-200">
                                <div className="card-body p-6">
                                    <h3 className="font-semibold mb-4">Integration Info</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-base-content/70">Status</span>
                                            <span className={`badge ${statusBadge.class} badge-sm`}>
                                                {statusBadge.text}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-base-content/70">Provider</span>
                                            <span className="text-sm font-medium capitalize">{integration.provider}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-base-content/70">Created</span>
                                            <span className="text-sm text-base-content/80">
                                                {new Date(integration.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-base-content/70">Last Updated</span>
                                            <span className="text-sm text-base-content/80">
                                                {new Date(integration.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>

                        {/* Quick Actions */}
                        <StaggerChild>
                            <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-200">
                                <div className="card-body p-6">
                                    <h3 className="font-semibold mb-4">Quick Actions</h3>
                                    <div className="space-y-3">
                                        <Link
                                            href={`/dashboard/integrations/${integration.id}/settings`}
                                            className="btn btn-outline btn-primary rounded-xl w-full justify-start"
                                        >
                                            <i className="fa-duotone fa-solid fa-cog mr-2" />
                                            Edit Settings
                                        </Link>
                                        <Link
                                            href={`/dashboard/outbox?provider=${integration.provider}`}
                                            className="btn btn-ghost rounded-xl w-full justify-start"
                                        >
                                            <i className="fa-duotone fa-solid fa-inbox mr-2" />
                                            View Outbox
                                        </Link>
                                        <button className="btn btn-ghost rounded-xl w-full justify-start">
                                            <i className="fa-duotone fa-solid fa-vial mr-2" />
                                            Test Integration
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>
                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
}
