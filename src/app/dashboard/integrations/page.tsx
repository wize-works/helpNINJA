import { getTenantIdServer } from "@/lib/auth";
import { query } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale, FadeIn, SlideIn } from "@/components/ui/animated-page";
import { Suspense } from "react";

export const runtime = 'nodejs'

type Row = { id: string; provider: 'email' | 'slack' | string; name: string; status: string; created_at: string }

async function list(tenantId: string) {
    const { rows } = await query<Row>(`select id, provider, name, status, created_at from public.integrations where tenant_id=$1 order by created_at desc`, [tenantId])
    return rows
}

const integrationTypes = [
    {
        id: 'slack',
        name: 'Slack',
        description: 'Send real-time notifications to your Slack channels when conversations need human attention',
        icon: 'fa-slack',
        color: 'info',
        features: ['Real-time notifications', 'Custom channels', 'Rich message formatting', 'Thread support'],
        configSchema: {
            webhook_url: { type: 'url', label: 'Webhook URL', required: true, placeholder: 'https://hooks.slack.com/...' },
            channel: { type: 'text', label: 'Channel', required: false, placeholder: '#support' },
            username: { type: 'text', label: 'Bot Username', required: false, placeholder: 'HelpNinja' }
        }
    },
    {
        id: 'email',
        name: 'Email',
        description: 'Get email notifications when your AI escalates conversations to human agents',
        icon: 'fa-envelope',
        color: 'success',
        features: ['Instant delivery', 'Multiple recipients', 'Rich HTML content', 'Attachment support'],
        configSchema: {
            to: { type: 'email', label: 'Recipient Email', required: true, placeholder: 'support@company.com' },
            subject_prefix: { type: 'text', label: 'Subject Prefix', required: false, placeholder: '[Support]' },
            template: { type: 'select', label: 'Template', required: false, options: ['default', 'minimal', 'detailed'] }
        }
    }
];

function IntegrationsPage({ integrations, tenantId }: { integrations: Row[]; tenantId: string }) {
    return (
        <div className="space-y-8">
            {/* Overview Stats */}
            <StaggerContainer>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StaggerChild>
                        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                                    <i className="fa-duotone fa-solid fa-puzzle-piece text-lg text-primary" aria-hidden />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-base-content">{integrations.length}</div>
                                    <div className="text-sm text-base-content/60">Total Integrations</div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                    
                    <StaggerChild>
                        <div className="bg-gradient-to-br from-success/5 to-success/10 rounded-2xl border border-success/20 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                                    <i className="fa-duotone fa-solid fa-circle-check text-lg text-success" aria-hidden />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-base-content">
                                        {integrations.filter(i => i.status === 'active').length}
                                    </div>
                                    <div className="text-sm text-base-content/60">Active & Running</div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                    
                    <StaggerChild>
                        <div className="bg-gradient-to-br from-info/5 to-info/10 rounded-2xl border border-info/20 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-info/20 rounded-xl flex items-center justify-center">
                                    <i className="fa-duotone fa-solid fa-bolt text-lg text-info" aria-hidden />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-base-content">
                                        {integrationTypes.length}
                                    </div>
                                    <div className="text-sm text-base-content/60">Available Types</div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </div>
            </StaggerContainer>

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Integration Marketplace */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-base-content">Integration Marketplace</h2>
                            <p className="text-sm text-base-content/60 mt-1">Connect external services to enhance your AI workflow</p>
                        </div>
                    </div>
                    
                    <StaggerContainer>
                        <div className="space-y-4">
                            {integrationTypes.map((type) => (
                                <StaggerChild key={type.id}>
                                    <IntegrationTypeCard 
                                        type={type} 
                                        tenantId={tenantId} 
                                        existingIntegrations={integrations.filter(i => i.provider === type.id)}
                                    />
                                </StaggerChild>
                            ))}
                        </div>
                    </StaggerContainer>
                </div>

                {/* Active Integrations Sidebar */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-base-content">Active Integrations</h2>
                        <p className="text-sm text-base-content/60 mt-1">Manage your connected services</p>
                    </div>
                    
                    <ActiveIntegrationsList integrations={integrations} tenantId={tenantId} />
                </div>
            </div>
        </div>
    );
}

function IntegrationTypeCard({ type, tenantId, existingIntegrations }: { 
    type: typeof integrationTypes[0]; 
    tenantId: string; 
    existingIntegrations: Row[] 
}) {
    return (
        <HoverScale scale={1.01}>
            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`w-16 h-16 ${getTypeColorBg(type.color)} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                            {type.id === "email" ?
                            <i className={`fa-duotone fa-solid ${type.icon} text-2xl ${getTypeColorText(type.color)}`} aria-hidden />
                            :
                            <i className={`fa-brands ${type.icon} text-2xl ${getTypeColorText(type.color)}`} aria-hidden />
                            }
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-base-content">{type.name}</h3>
                                    <p className="text-sm text-base-content/60 mt-1">{type.description}</p>
                                </div>
                                
                                {existingIntegrations.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-2 h-2 bg-success rounded-full"></div>
                                        <span className="text-success font-medium">{existingIntegrations.length} connected</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Features */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {type.features.map((feature, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm text-base-content/70">
                                        <i className="fa-duotone fa-solid fa-check text-xs text-success" aria-hidden />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                <CreateIntegrationButton type={type} tenantId={tenantId} />
                                <button className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/60 hover:text-base-content transition-colors">
                                    <i className="fa-duotone fa-solid fa-book text-xs" aria-hidden />
                                    View Documentation
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                    </div>
            </HoverScale>
    );
}

function CreateIntegrationButton({ type, tenantId }: { type: typeof integrationTypes[0]; tenantId: string }) {
    return (
        <HoverScale scale={1.02}>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200">
                <i className="fa-duotone fa-solid fa-plus text-xs" aria-hidden />
                Connect {type.name}
            </button>
        </HoverScale>
    );
}

function ActiveIntegrationsList({ integrations, tenantId }: { integrations: Row[]; tenantId: string }) {
    if (integrations.length === 0) {
        return (
            <FadeIn>
                <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-base-200/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <i className="fa-duotone fa-solid fa-plug text-2xl text-base-content/40" aria-hidden />
                        </div>
                        <h3 className="font-semibold text-base-content mb-2">No integrations yet</h3>
                        <p className="text-sm text-base-content/60 mb-4">
                            Connect your first integration to start receiving notifications when your AI needs help.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-xs text-base-content/50">
                            <i className="fa-duotone fa-solid fa-arrow-left" aria-hidden />
                            <span>Choose from the marketplace</span>
                        </div>
                    </div>
                </div>
            </FadeIn>
        );
    }

    return (
        <StaggerContainer>
            <div className="space-y-4">
                {integrations.map((integration) => (
                    <StaggerChild key={integration.id}>
                        <ActiveIntegrationCard integration={integration} tenantId={tenantId} />
                    </StaggerChild>
                ))}
            </div>
        </StaggerContainer>
    );
}

function ActiveIntegrationCard({ integration, tenantId }: { integration: Row; tenantId: string }) {
    const type = integrationTypes.find(t => t.id === integration.provider);
    
    return (
        <HoverScale scale={1.02}>
            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-xl border border-base-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${getTypeColorBg(type?.color || 'accent')} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            {type?.id === "email" ?
                            <i className={`fa-duotone fa-solid ${type?.icon || 'fa-puzzle-piece'} ${getTypeColorText(type?.color || 'accent')}`} aria-hidden />
                            :
                            <i className={`fa-brands ${type?.icon || 'fa-puzzle-piece'} ${getTypeColorText(type?.color || 'accent')}`} aria-hidden />
                            }
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-base-content truncate">{integration.name}</h4>
                                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                                    integration.status === 'active' 
                                        ? 'bg-success/10 text-success' 
                                        : 'bg-warning/10 text-warning'
                                }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                        integration.status === 'active' ? 'bg-success' : 'bg-warning'
                                    }`}></div>
                                    {integration.status}
                                </div>
                            </div>
                            
                            <div className="text-xs text-base-content/60 mb-3 capitalize">
                                {integration.provider} • Added {new Date(integration.created_at).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                })}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <ToggleButton id={integration.id} tenantId={tenantId} status={integration.status} />
                                <button className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-base-content/60 hover:text-base-content transition-colors">
                                    <i className="fa-duotone fa-solid fa-gear" aria-hidden />
                                    Settings
                                </button>
                                <DeleteButton id={integration.id} tenantId={tenantId} />
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </HoverScale>
    );
}

export default async function IntegrationsPageWrapper() {
    const tenantId = await getTenantIdServer({ allowEnvFallback: true })
    
    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Integrations", icon: "fa-puzzle-piece" }
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
                        <div className="text-center max-w-3xl mx-auto">
                            <h1 className="text-4xl font-bold text-base-content mb-4">
                                Integration Marketplace
                            </h1>
                            <p className="text-lg text-base-content/60">
                                Extend your AI support capabilities by connecting external services. 
                                Get notified when conversations need human intervention and streamline your workflow.
                            </p>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
                
                {/* Content */}
                <Suspense fallback={<IntegrationsSkeleton />}>
                    <IntegrationsContent tenantId={tenantId} />
                </Suspense>
            </div>
        </AnimatedPage>
    )
}

async function IntegrationsContent({ tenantId }: { tenantId: string }) {
    const integrations = await list(tenantId);
    return <IntegrationsPage integrations={integrations} tenantId={tenantId} />;
}

function IntegrationsSkeleton() {
    return (
        <div className="space-y-8">
            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-base-300/60 rounded-xl animate-pulse"></div>
                            <div className="space-y-2">
                                <div className="h-6 w-12 bg-base-300/60 rounded animate-pulse"></div>
                                <div className="h-4 w-24 bg-base-300/60 rounded animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Content skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-4">
                    {Array.from({ length: 2 }, (_, i) => (
                        <div key={i} className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-base-300/60 rounded-2xl animate-pulse"></div>
                                <div className="flex-1 space-y-3">
                                    <div className="h-5 w-32 bg-base-300/60 rounded animate-pulse"></div>
                                    <div className="h-4 w-full bg-base-300/60 rounded animate-pulse"></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Array.from({ length: 4 }, (_, j) => (
                                            <div key={j} className="h-3 w-20 bg-base-300/60 rounded animate-pulse"></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm p-8">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-base-300/60 rounded-2xl mx-auto animate-pulse"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-base-300/60 rounded mx-auto animate-pulse"></div>
                                <div className="h-3 w-48 bg-base-300/60 rounded mx-auto animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToggleButton({ id, status, tenantId }: { id: string; status: string; tenantId: string }) {
    async function action() {
        'use server'
        const next = status === 'active' ? 'disabled' : 'active'
        await fetch(`${process.env.SITE_URL || ''}/api/integrations/${id}/status`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
            body: JSON.stringify({ status: next })
        })
    }
    
    return (
        <form action={action}>
            <HoverScale scale={1.05}>
                <button className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    status === 'active' 
                        ? 'bg-warning/10 hover:bg-warning/20 text-warning' 
                        : 'bg-success/10 hover:bg-success/20 text-success'
                }`}>
                    <i className={`fa-duotone fa-solid ${status === 'active' ? 'fa-pause' : 'fa-play'}`} aria-hidden />
                    {status === 'active' ? 'Pause' : 'Enable'}
                </button>
            </HoverScale>
        </form>
    )
}

function DeleteButton({ id, tenantId }: { id: string; tenantId: string }) {
    async function action() {
        'use server'
        await fetch(`${process.env.SITE_URL || ''}/api/integrations/${id}`, {
            method: 'DELETE',
            headers: { 'x-tenant-id': tenantId }
        })
    }
    
    return (
        <form action={action}>
            <HoverScale scale={1.05}>
                <button 
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-error/80 hover:text-error hover:bg-error/10 transition-all duration-200" 
                    aria-label="Delete integration"
                    title="Delete integration"
                >
                    <i className="fa-duotone fa-solid fa-trash" aria-hidden />
                </button>
            </HoverScale>
        </form>
    )
}

function getTypeColorBg(color: string) {
    switch (color) {
        case 'info': return 'bg-info/10';
        case 'success': return 'bg-success/10';
        case 'accent': return 'bg-accent/10';
        default: return 'bg-accent/10';
    }
}

function getTypeColorText(color: string) {
    switch (color) {
        case 'info': return 'text-info';
        case 'success': return 'text-success';
        case 'accent': return 'text-accent';
        default: return 'text-accent';
    }
}
