"use client";

import { useState } from 'react';
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale, FadeIn, SlideIn } from "@/components/ui/animated-page";
import { toast } from '@/lib/toast';

const integrationTypes = [
    {
        id: 'slack',
        name: 'Slack',
        description: 'Send real-time notifications to your Slack channels when conversations need human attention',
        icon: 'fa-brands fa-slack',
        color: 'info',
        features: ['Real-time notifications', 'Custom channels', 'Rich message formatting', 'Thread support'],
        configSchema: {
            webhook_url: { type: 'url', label: 'Webhook URL', required: true, placeholder: 'https://hooks.slack.com/...' },
            channel: { type: 'text', label: 'Channel', required: false, placeholder: '#support' },
            username: { type: 'text', label: 'Bot Username', required: false, placeholder: 'helpNINJA' }
        }
    },
    {
        id: 'email',
        name: 'Email',
        description: 'Get email notifications when your AI escalates conversations to human agents',
        icon: 'fa-solid fa-duotone fa-envelope',
        color: 'success',
        features: ['Instant delivery', 'Multiple recipients', 'Rich HTML content', 'Attachment support'],
        configSchema: {
            to: { type: 'email', label: 'Recipient Email', required: true, placeholder: 'support@company.com' },
            subject_prefix: { type: 'text', label: 'Subject Prefix', required: false, placeholder: '[Support]' },
            template: { type: 'select', label: 'Template', required: false, options: ['default', 'minimal', 'detailed'] }
        }
    },
    {
        id: 'teams',
        name: 'Microsoft Teams',
        description: 'Send rich escalation notifications to Microsoft Teams channels using modern Adaptive Cards',
        icon: 'fa-brands fa-microsoft',
        color: 'primary',
        features: ['Modern Adaptive Cards', 'Rich formatting & links', 'Action buttons', 'Professional layout'],
        configSchema: {
            webhook_url: { type: 'url', label: 'Teams Webhook URL', required: true, placeholder: 'https://outlook.office.com/webhook/...' },
            team_name: { type: 'text', label: 'Team Name', required: false, placeholder: 'Support Team' }
        }
    },
    {
        id: 'discord',
        name: 'Discord',
        description: 'Send rich escalation notifications to Discord channels with beautiful embeds and color-coded alerts',
        icon: 'fa-brands fa-discord',
        color: 'secondary',
        features: ['Rich embeds', 'Color-coded alerts', 'Custom bot appearance', 'Clickable links'],
        configSchema: {
            webhook_url: { type: 'url', label: 'Discord Webhook URL', required: true, placeholder: 'https://discord.com/api/webhooks/...' },
            username: { type: 'text', label: 'Bot Username', required: false, placeholder: 'helpNINJA Bot' }
        }
    },
    {
        id: 'zoom',
        name: 'Zoom',
        description: 'Send rich escalation notifications to Zoom chat channels using Zoom\'s Incoming Webhook Chatbot',
        icon: 'fa-solid fa-video',
        color: 'info',
        features: ['Rich field-based messages', 'Channel targeting', 'Secure token authentication', 'Multiple message formats'],
        configSchema: {
            webhook_url: { type: 'url', label: 'Zoom Webhook URL', required: true, placeholder: 'https://integrations.zoom.us/chat/webhooks/incomingwebhook/{webhook_id}' },
            verification_token: { type: 'password', label: 'Verification Token', required: true, placeholder: 'Verification token from /inc connect command' }
        }
    },
    {
        id: 'zendesk',
        name: 'Zendesk',
        description: 'Create tickets automatically when AI escalates conversations',
        icon: 'fa-solid fa-duotone fa-life-ring',
        color: 'warning',
        features: ['Auto-ticket creation', 'Priority mapping', 'Custom fields', 'Agent assignment'],
        configSchema: {
            subdomain: { type: 'text', label: 'Zendesk Subdomain', required: true, placeholder: 'yourcompany' },
            api_token: { type: 'password', label: 'API Token', required: true, placeholder: 'API token...' },
            email: { type: 'email', label: 'Admin Email', required: true, placeholder: 'admin@company.com' }
        },
        comingSoon: true
    },
    {
        id: 'webhooks',
        name: 'Custom Webhooks',
        description: 'Send data to any external service using custom webhook endpoints',
        icon: 'fa-solid fa-duotone fa-code',
        color: 'accent',
        features: ['Custom endpoints', 'JSON payloads', 'Signature verification', 'Retry logic'],
        configSchema: {
            url: { type: 'url', label: 'Webhook URL', required: true, placeholder: 'https://your-service.com/webhook' },
            secret: { type: 'password', label: 'Secret Key', required: false, placeholder: 'Optional for verification' },
            events: { type: 'multiselect', label: 'Events', required: true, options: ['escalation', 'conversation_start', 'message_sent'] }
        }
    },
    {
        id: 'custom',
        name: 'Custom Integration',
        description: 'Build your own custom integration for specialized workflows and requirements',
        icon: 'fa-solid fa-duotone fa-puzzle-piece',
        color: 'accent',
        features: ['Full API access', 'Custom logic', 'Flexible configuration', 'Advanced workflows'],
        configSchema: {
            endpoint: { type: 'url', label: 'API Endpoint', required: true, placeholder: 'https://your-api.com/endpoint' },
            auth_method: { type: 'select', label: 'Authentication', required: true, options: ['bearer', 'basic', 'apikey', 'none'] },
            auth_value: { type: 'password', label: 'Auth Token/Key', required: false, placeholder: 'Authentication credential' }
        }
    },
    {
        id: 'freshdesk',
        name: 'Freshdesk',
        description: 'Automatically create support tickets in Freshdesk when conversations need human attention',
        icon: 'fa-solid fa-duotone fa-headset',
        color: 'success',
        features: ['Auto-ticket creation', 'Priority assignment', 'Custom fields', 'Agent routing'],
        configSchema: {
            domain: { type: 'text', label: 'Freshdesk Domain', required: true, placeholder: 'yourcompany.freshdesk.com' },
            api_key: { type: 'password', label: 'API Key', required: true, placeholder: 'Your Freshdesk API key' },
            group_id: { type: 'text', label: 'Group ID', required: false, placeholder: 'Default group for tickets' }
        },
        comingSoon: true
    },
    {
        id: 'servicenow',
        name: 'ServiceNow',
        description: 'Create incidents and service requests in ServiceNow for enterprise support workflows',
        icon: 'fa-solid fa-duotone fa-building',
        color: 'info',
        features: ['Incident creation', 'Service requests', 'CMDB integration', 'SLA tracking'],
        configSchema: {
            instance_url: { type: 'url', label: 'ServiceNow Instance URL', required: true, placeholder: 'https://yourinstance.service-now.com' },
            username: { type: 'text', label: 'Username', required: true, placeholder: 'ServiceNow username' },
            password: { type: 'password', label: 'Password', required: true, placeholder: 'ServiceNow password' }
        },
        comingSoon: true
    },
    {
        id: 'linear',
        name: 'Linear',
        description: 'Create issues in Linear for modern product development and bug tracking workflows',
        icon: 'fa-solid fa-duotone fa-route',
        color: 'primary',
        features: ['Issue creation', 'Priority levels', 'Team assignment', 'Project tracking'],
        configSchema: {
            api_key: { type: 'password', label: 'Linear API Key', required: true, placeholder: 'Your Linear API key' },
            team_id: { type: 'text', label: 'Team ID', required: true, placeholder: 'Default team for issues' },
            project_id: { type: 'text', label: 'Project ID', required: false, placeholder: 'Optional project assignment' }
        },
        comingSoon: true
    },
    {
        id: 'github',
        name: 'GitHub',
        description: 'Create GitHub issues automatically when technical problems need developer attention',
        icon: 'fa-brands fa-github',
        color: 'neutral',
        features: ['Issue creation', 'Label assignment', 'Repository targeting', 'Milestone tracking'],
        configSchema: {
            repo_owner: { type: 'text', label: 'Repository Owner', required: true, placeholder: 'username or org' },
            repo_name: { type: 'text', label: 'Repository Name', required: true, placeholder: 'repository-name' },
            access_token: { type: 'password', label: 'Personal Access Token', required: true, placeholder: 'GitHub PAT with repo access' }
        },
        comingSoon: true
    },
    {
        id: 'gitlab',
        name: 'GitLab',
        description: 'Create GitLab issues for development and technical support workflows',
        icon: 'fa-brands fa-gitlab',
        color: 'warning',
        features: ['Issue creation', 'Label management', 'Milestone assignment', 'Merge request linking'],
        configSchema: {
            project_id: { type: 'text', label: 'Project ID', required: true, placeholder: 'GitLab project ID' },
            access_token: { type: 'password', label: 'Access Token', required: true, placeholder: 'GitLab access token' },
            gitlab_url: { type: 'url', label: 'GitLab URL', required: false, placeholder: 'https://gitlab.com (default)' }
        },
        comingSoon: true
    },
    {
        id: 'zoho',
        name: 'Zoho Desk',
        description: 'Integrate with Zoho Desk for comprehensive customer support ticket management',
        icon: 'fa-solid fa-duotone fa-ticket',
        color: 'error',
        features: ['Ticket creation', 'Department routing', 'Priority management', 'Customer linking'],
        configSchema: {
            org_id: { type: 'text', label: 'Organization ID', required: true, placeholder: 'Zoho organization ID' },
            access_token: { type: 'password', label: 'Access Token', required: true, placeholder: 'Zoho Desk access token' },
            department_id: { type: 'text', label: 'Department ID', required: false, placeholder: 'Default department' }
        },
        comingSoon: true
    },
    {
        id: 'cherwell',
        name: 'Cherwell',
        description: 'Create incidents and service requests in Cherwell Service Management',
        icon: 'fa-solid fa-duotone fa-wrench',
        color: 'secondary',
        features: ['Incident management', 'Service requests', 'Change management', 'Asset tracking'],
        configSchema: {
            server_url: { type: 'url', label: 'Cherwell Server URL', required: true, placeholder: 'https://your-cherwell-server.com' },
            client_id: { type: 'text', label: 'Client ID', required: true, placeholder: 'API client ID' },
            username: { type: 'text', label: 'Username', required: true, placeholder: 'Cherwell username' },
            password: { type: 'password', label: 'Password', required: true, placeholder: 'Cherwell password' }
        },
        comingSoon: true
    },
    {
        id: 'jira',
        name: 'Jira',
        description: 'Create Jira tickets for issue tracking and project management workflows',
        icon: 'fa-brands fa-jira',
        color: 'info',
        features: ['Issue creation', 'Project assignment', 'Custom fields', 'Workflow integration'],
        configSchema: {
            server_url: { type: 'url', label: 'Jira Server URL', required: true, placeholder: 'https://yourcompany.atlassian.net' },
            email: { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            api_token: { type: 'password', label: 'API Token', required: true, placeholder: 'Jira API token' },
            project_key: { type: 'text', label: 'Project Key', required: true, placeholder: 'PROJ' }
        },
        comingSoon: true
    }
];

export default function IntegrationsMarketplacePage() {
    const [showSetupModal, setShowSetupModal] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSetupIntegration = async (provider: string, config: Record<string, string | string[]>) => {
        setLoading(true);
        try {
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider,
                    name: integrationTypes.find(t => t.id === provider)?.name || provider,
                    config
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to setup integration');
            }

            toast.success({ message: `${integrationTypes.find(t => t.id === provider)?.name} integration configured successfully!` });
            setShowSetupModal(null);
        } catch (error) {
            console.error('Error setting up integration:', error);
            toast.error({ message: error instanceof Error ? error.message : 'Failed to setup integration' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Header */}
                <FadeIn>
                    <div className="flex items-center justify-between">
                        <div>
                            <Breadcrumb
                                items={[
                                    { label: "Integrations", href: "/dashboard/integrations" },
                                    { label: "Marketplace", href: "/dashboard/integrations/marketplace" }
                                ]}
                            />
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                Integrations Marketplace
                            </h1>
                            <p className="text-base-content/70 mt-2">
                                Discover and install integrations to extend your helpNINJA capabilities
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* Categories */}
                <SlideIn delay={0.1}>
                    <div className="flex gap-3 flex-wrap">
                        <button className="btn btn-primary rounded-xl">
                            <i className="fa-duotone fa-solid fa-sparkles mr-2" />
                            All Integrations
                        </button>
                        <button className="btn  rounded-xl">
                            <i className="fa-duotone fa-solid fa-bell mr-2" />
                            Notifications
                        </button>
                        <button className="btn  rounded-xl">
                            <i className="fa-duotone fa-solid fa-ticket mr-2" />
                            Ticketing
                        </button>
                        <button className="btn  rounded-xl">
                            <i className="fa-duotone fa-solid fa-code mr-2" />
                            Developer
                        </button>
                    </div>
                </SlideIn>

                {/* Integration Cards */}
                <StaggerContainer>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {integrationTypes.map((integration) => (
                            <StaggerChild key={integration.id}>
                                <HoverScale scale={1.02}>
                                    <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-lg transition-all duration-300">
                                        <div className="p-6">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-16 h-16 rounded-2xl bg-${integration.color}/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                                                        <i className={`${integration.icon} text-2xl text-${integration.color}`} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-semibold text-base-content mb-1">{integration.name}</h3>
                                                        {integration.comingSoon && (
                                                            <span className="badge badge-outline badge-sm">Coming Soon</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-base-content/70 text-sm mb-6 leading-relaxed">
                                                {integration.description}
                                            </p>

                                            {/* Features */}
                                            <div className="mb-6">
                                                <h4 className="font-semibold text-sm mb-3 text-base-content/80 tracking-wide uppercase">Features</h4>
                                                <div className="space-y-2">
                                                    {integration.features.slice(0, 3).map((feature, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-sm text-base-content/70">
                                                            <i className="fa-duotone fa-solid fa-check text-success text-xs" />
                                                            {feature}
                                                        </div>
                                                    ))}
                                                    {integration.features.length > 3 && (
                                                        <div className="text-xs text-base-content/50 pt-1">
                                                            +{integration.features.length - 3} more features
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div className="flex justify-end">
                                                {integration.comingSoon ? (
                                                    <button className="btn btn-outline rounded-xl" disabled>
                                                        <i className="fa-duotone fa-solid fa-clock mr-2" />
                                                        Coming Soon
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={`btn btn-${integration.color} rounded-xl`}
                                                        onClick={() => setShowSetupModal(integration.id)}
                                                    >
                                                        <i className="fa-duotone fa-solid fa-plus mr-2" />
                                                        Install
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </HoverScale>
                            </StaggerChild>
                        ))}
                    </div>
                </StaggerContainer>

                {/* Setup Modal */}
                {showSetupModal && (
                    <IntegrationSetupModal
                        integration={integrationTypes.find(t => t.id === showSetupModal)!}
                        onClose={() => setShowSetupModal(null)}
                        onSubmit={handleSetupIntegration}
                        loading={loading}
                    />
                )}
            </div>
        </AnimatedPage>
    );
}

function IntegrationSetupModal({
    integration,
    onClose,
    onSubmit,
    loading
}: {
    integration: typeof integrationTypes[0];
    onClose: () => void;
    onSubmit: (provider: string, config: Record<string, string | string[]>) => void;
    loading: boolean;
}) {
    const [formData, setFormData] = useState<Record<string, string | string[]>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(integration.id, formData);
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-12 h-12 rounded-xl bg-${integration.color}/10 flex items-center justify-center`}>
                            <i className={`fa-brands ${integration.icon} text-lg text-${integration.color}`} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-base-content">
                                Setup {integration.name} Integration
                            </h3>
                            <p className="text-sm text-base-content/60">
                                Configure your {integration.name} integration settings
                            </p>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4 mb-6">
                        {Object.entries(integration.configSchema).map(([key, field]) => (
                            <div key={key} className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">
                                        {field.label}
                                        {field.required && <span className="text-error ml-1">*</span>}
                                    </span>
                                </label>
                                {field.type === 'select' ? (
                                    <select
                                        className="select select-bordered w-full"
                                        value={formData[key] || ''}
                                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                        required={field.required}
                                    >
                                        <option value="">Select...</option>
                                        {field.options?.map((option: string) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : 'text'}
                                        className="input input-bordered w-full"
                                        placeholder={field.placeholder}
                                        value={formData[key] || ''}
                                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                        required={field.required}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="modal-action">
                        <button type="button" className="btn  rounded-xl" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className={`btn btn-${integration.color} rounded-xl`} disabled={loading}>
                            {loading && <span className="loading loading-spinner loading-sm mr-2" />}
                            Install Integration
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
