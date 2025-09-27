import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, FadeIn, SlideIn } from "@/components/ui/animated-page";
import { WebhookAnalyticsDashboard } from "@/components/webhook-analytics-dashboard";
//
import Link from "next/link";
import StatCard from "@/components/ui/stat-card";

export const runtime = 'nodejs'

type Row = { id: string; provider: 'email' | 'slack' | string; name: string; status: string; created_at: string }

async function list(tenantId: string) {
    const { rows } = await query<Row>(`select id, provider, name, status, created_at from public.integrations where tenant_id=$1 order by created_at desc`, [tenantId])
    return rows
}

function IntegrationsPage({ integrations }: { integrations: Row[]; tenantId: string }) {
    const activeIntegrations = integrations.filter(i => i.status === 'active');
    const totalIntegrations = integrations.length;
    const healthyIntegrations = integrations.filter(i => i.status === 'active').length;

    return (
        <div className="space-y-8">
            {/* Header */}
            <FadeIn>
                <div className="flex items-center justify-between">
                    <div>
                        <Breadcrumb items={[{ label: "Integrations Dashboard", href: "/dashboard/integrations" }]} />
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Integration Dashboard
                        </h1>
                        <p className="text-base-content/70 mt-2">
                            Monitor your active integrations and webhook performance
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/dashboard/integrations/marketplace"
                            className="btn btn-outline btn-primary rounded-xl"
                        >
                            <i className="fa-duotone fa-solid fa-plus mr-2" />
                            Add Integration
                        </Link>
                        <Link
                            href="/dashboard/settings/api"
                            className="btn  rounded-xl"
                        >
                            <i className="fa-duotone fa-solid fa-key mr-2" />
                            API Keys
                        </Link>
                    </div>
                </div>
            </FadeIn>


            {/* Main Content */}
            <div className="space-y-8">
                {/* Webhook Analytics Section */}
                <SlideIn delay={0.1}>
                    <div>
                        <WebhookAnalyticsDashboard />
                    </div>
                </SlideIn>

                {/* Active Integrations Management */}
                <SlideIn delay={0.2}>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Main Integrations List */}
                        <div className="xl:col-span-2 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-base-content">Active Integrations</h2>
                                    <p className="text-sm text-base-content/60 mt-1">Manage and monitor your connected services</p>
                                </div>
                            </div>

                            {activeIntegrations.length > 0 ? (
                                <ActiveIntegrationsTable rows={activeIntegrations} />
                            ) : (
                                <div className="card bg-base-100 border-2 border-dashed border-base-300 p-12 text-center shadow-xl rounded-2xl">
                                    <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i className="fa-duotone fa-solid fa-plug text-2xl text-base-content/40" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">No Active Integrations</h3>
                                    <p className="text-base-content/60 mb-6">Connect external services to enhance your workflow</p>
                                    <Link href="/dashboard/integrations/marketplace" className="btn btn-primary rounded-xl">
                                        <i className="fa-duotone fa-solid fa-plus mr-2" />
                                        Browse Marketplace
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <IntegrationQuickActions />
                            <IntegrationHealth integrations={integrations} />
                        </div>
                    </div>
                </SlideIn>
            </div>
        </div>
    );
}

// Removed unused WebhookCount helper

function ActiveIntegrationsTable({ rows }: { rows: Row[] }) {
    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'slack': return 'fa-brands fa-slack';
            case 'email': return 'fa-duotone fa-solid fa-envelope';
            case 'teams': return 'fa-brands fa-microsoft';
            case 'discord': return 'fa-brands fa-discord';
            default: return 'fa-duotone fa-solid fa-plug';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return 'badge-success';
            case 'error': return 'badge-error';
            case 'warning': return 'badge-warning';
            default: return 'badge-ghost';
        }
    };

    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Integration</th>
                            <th>Provider</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((integration) => (
                            <tr key={integration.id} className="hover">
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                            <i className={`${getProviderIcon(integration.provider)} text-primary`} />
                                        </div>
                                        <div>
                                            <div className="font-semibold">{integration.name}</div>
                                            <div className="text-xs text-base-content/60">{integration.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="capitalize">{integration.provider}</td>
                                <td>
                                    <span className={`badge ${getStatusBadge(integration.status)} badge-sm`}>
                                        {integration.status}
                                    </span>
                                </td>
                                <td>
                                    <span className="text-sm">
                                        {new Date(integration.created_at).toLocaleDateString()}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <Link href={`/dashboard/integrations/${integration.id}`} className="btn btn-sm btn-outline rounded-lg" title="View details">
                                            <i className="fa-duotone fa-solid fa-eye" />
                                        </Link>
                                        <Link href={`/dashboard/integrations/${integration.id}/settings`} className="btn btn-sm  rounded-lg" title="Settings">
                                            <i className="fa-duotone fa-solid fa-cog" />
                                        </Link>
                                        <Link href={`/dashboard/integrations/${integration.id}/delete`} className="btn btn-sm  text-error rounded-lg" title="Remove">
                                            <i className="fa-duotone fa-solid fa-trash" />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function IntegrationQuickActions() {
    return (
        <div className="card bg-base-100 border border-base-200 shadow-xl rounded-2xl">
            <div className="card-body p-6">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                    <Link href="/dashboard/integrations/marketplace" className="btn btn-outline btn-primary rounded-lg btn-sm w-full justify-start">
                        <i className="fa-duotone fa-solid fa-plus mr-2" />
                        Add Integration
                    </Link>
                    <Link href="/dashboard/settings/api" className="btn  rounded-lg btn-sm w-full justify-start">
                        <i className="fa-duotone fa-solid fa-key mr-2" />
                        Manage API Keys
                    </Link>
                    <button className="btn  rounded-lg btn-sm w-full justify-start">
                        <i className="fa-duotone fa-solid fa-download mr-2" />
                        Export Logs
                    </button>
                </div>
            </div>
        </div>
    );
}

function IntegrationHealth({ integrations }: { integrations: Row[] }) {
    const totalIntegrations = integrations.length;
    const healthyIntegrations = integrations.filter(i => i.status === 'active').length;
    const errorIntegrations = integrations.filter(i => i.status === 'error').length;

    return (
        <div className="card bg-base-100 border border-base-200 shadow-xl rounded-2xl">
            <div className="card-body p-6">
                <h3 className="font-semibold mb-4">System Health</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-base-content/70">Healthy</span>
                        <span className="text-success font-medium">{healthyIntegrations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-base-content/70">Errors</span>
                        <span className="text-error font-medium">{errorIntegrations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-base-content/70">Total</span>
                        <span className="font-medium">{totalIntegrations}</span>
                    </div>
                    <div className="divider my-3"></div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Overall Health</span>
                        <span className="text-success font-bold">
                            {totalIntegrations > 0 ? Math.round((healthyIntegrations / totalIntegrations) * 100) : 100}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default async function IntegrationsPageRoute() {
    const tenantId = await getTenantIdStrict();
    const integrations = await list(tenantId);

    return (
        <AnimatedPage>
            <IntegrationsPage integrations={integrations} tenantId={tenantId} />
        </AnimatedPage>
    );
}