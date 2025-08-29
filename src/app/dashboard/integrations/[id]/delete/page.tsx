import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, FadeIn } from "@/components/ui/animated-page";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteIntegrationForm } from "@/components/delete-integration-form";

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

export default async function DeleteIntegrationPage({ params }: { params: Promise<{ id: string }> }) {
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
        { label: "Delete", icon: "fa-trash" }
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
                            <div className="w-16 h-16 bg-error/10 rounded-xl flex items-center justify-center">
                                <i className="fa-duotone fa-solid fa-trash text-2xl text-error" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">Delete Integration</h1>
                                <p className="text-base-content/60 mt-1">
                                    Permanently remove &ldquo;{integration.name}&rdquo; integration
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <Link
                                href={`/dashboard/integrations/${integration.id}`}
                                className="btn btn-ghost rounded-xl"
                            >
                                <i className="fa-duotone fa-solid fa-arrow-left mr-2" />
                                Cancel
                            </Link>
                        </div>
                    </div>
                </FadeIn>

                {/* Warning Card */}
                <StaggerChild>
                    <div className="card bg-error/5 shadow-xl rounded-2xl border border-error/20">
                        <div className="card-body p-8">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-error/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <i className="fa-duotone fa-solid fa-exclamation-triangle text-xl text-error" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-semibold text-error mb-2">
                                        This action cannot be undone
                                    </h2>
                                    <p className="text-base-content/70 mb-4">
                                        Deleting this integration will permanently remove:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-base-content/70 mb-6">
                                        <li>All integration configuration and credentials</li>
                                        <li>Webhook delivery history and logs</li>
                                        <li>Any escalation rules targeting this integration</li>
                                        <li>Pending items in the integration outbox</li>
                                    </ul>
                                    
                                    <div className="flex items-center gap-4 p-4 bg-base-200/40 rounded-xl">
                                        <div className={`w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center`}>
                                            <i className={`${getProviderIcon(integration.provider)} text-lg text-primary`} />
                                        </div>
                                        <div>
                                            <div className="font-medium">{integration.name}</div>
                                            <div className="text-sm text-base-content/60 capitalize">
                                                {integration.provider} Integration • {integration.status}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </StaggerChild>

                {/* Delete Form */}
                <StaggerChild>
                    <div className="card bg-base-100 shadow-xl rounded-2xl border border-base-200">
                        <div className="card-body p-8">
                            <DeleteIntegrationForm integration={integration} />
                        </div>
                    </div>
                </StaggerChild>
            </div>
        </AnimatedPage>
    );
}
