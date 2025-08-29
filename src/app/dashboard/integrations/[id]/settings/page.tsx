import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, FadeIn } from "@/components/ui/animated-page";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IntegrationSettingsForm } from "@/components/integration-settings-form";

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

async function getIntegration(tenantId: string, integrationId: string): Promise<IntegrationDetails | null> {
    const { rows } = await query<IntegrationDetails>(
        `SELECT * FROM public.integrations WHERE tenant_id = $1 AND id = $2`,
        [tenantId, integrationId]
    );
    return rows[0] || null;
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

export default async function IntegrationSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const tenantId = await getTenantIdStrict();
    const { id } = await params;
    
    const integration = await getIntegration(tenantId, id);
    
    if (!integration) {
        notFound();
    }

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Integrations", href: "/dashboard/integrations", icon: "fa-plug" },
        { label: integration.name, href: `/dashboard/integrations/${integration.id}`, icon: "fa-eye" },
        { label: "Settings", icon: "fa-cog" }
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
                                <h1 className="text-3xl font-bold text-base-content">Integration Settings</h1>
                                <p className="text-base-content/60 mt-1">{integration.name} • {integration.provider}</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <Link
                                href={`/dashboard/integrations/${integration.id}`}
                                className="btn btn-ghost rounded-xl"
                            >
                                <i className="fa-duotone fa-solid fa-arrow-left mr-2" />
                                Back to Details
                            </Link>
                        </div>
                    </div>
                </FadeIn>

                {/* Settings Form */}
                <StaggerChild>
                    <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-200">
                        <div className="card-body p-8">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold mb-2">Configuration</h2>
                                <p className="text-base-content/60">
                                    Update your {integration.provider} integration settings and credentials.
                                </p>
                            </div>
                            
                            <IntegrationSettingsForm integration={integration} />
                        </div>
                    </div>
                </StaggerChild>

                {/* Danger Zone */}
                <StaggerChild>
                    <div className="card bg-error/5 shadow-xl rounded-2xl border border-error/20">
                        <div className="card-body p-8">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold mb-2 text-error">Danger Zone</h2>
                                <p className="text-base-content/60">
                                    Irreversible and destructive actions.
                                </p>
                            </div>
                            
                            <div className="space-y-4">
                                {integration.status === 'active' ? (
                                    <div className="flex items-center justify-between p-4 bg-warning/10 border border-warning/20 rounded-xl">
                                        <div>
                                            <h3 className="font-medium">Disable Integration</h3>
                                            <p className="text-sm text-base-content/60">Temporarily stop this integration from receiving events.</p>
                                        </div>
                                        <Link
                                            href={`/dashboard/integrations/${integration.id}/disable`}
                                            className="btn btn-warning rounded-lg"
                                        >
                                            Disable
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-xl">
                                        <div>
                                            <h3 className="font-medium">Enable Integration</h3>
                                            <p className="text-sm text-base-content/60">Reactivate this integration to receive events.</p>
                                        </div>
                                        <Link
                                            href={`/dashboard/integrations/${integration.id}/enable`}
                                            className="btn btn-success rounded-lg"
                                        >
                                            Enable
                                        </Link>
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between p-4 bg-error/10 border border-error/20 rounded-xl">
                                    <div>
                                        <h3 className="font-medium text-error">Delete Integration</h3>
                                        <p className="text-sm text-base-content/60">Permanently remove this integration and all its data.</p>
                                    </div>
                                    <Link
                                        href={`/dashboard/integrations/${integration.id}/delete`}
                                        className="btn btn-error rounded-lg"
                                    >
                                        Delete
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </StaggerChild>
            </div>
        </AnimatedPage>
    );
}
