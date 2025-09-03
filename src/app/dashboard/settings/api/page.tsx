"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from "@/components/tenant-context";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild } from "@/components/ui/animated-page";
import { toastUtils } from '@/lib/toast';
import StatCard, { SimpleStatCard } from '@/components/ui/stat-card';

type ApiKey = {
    id: string;
    name: string;
    key_type: 'public' | 'secret' | 'webhook';
    key_prefix: string;
    permissions: string[];
    last_used_at: string | null;
    usage_count: number;
    rate_limit_per_hour: number;
    expires_at: string | null;
    created_at: string;
    created_by_name: string;
    is_expired: boolean;
};

type Webhook = {
    id: string;
    name: string;
    url: string;
    events: string[];
    is_active: boolean;
    last_success_at: string | null;
    last_failure_at: string | null;
    failure_count: number;
    created_at: string;
    stats: {
        total_deliveries: number;
        successful_deliveries: number;
        failed_deliveries: number;
        success_rate: number;
    };
};

export default function ApiKeysPage() {
    const { tenantId } = useTenant();
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'api-keys' | 'webhooks'>('api-keys');
    const [showCreateApiKey, setShowCreateApiKey] = useState(false);
    const [showCreateWebhook, setShowCreateWebhook] = useState(false);
    const [showEditApiKey, setShowEditApiKey] = useState<string | null>(null);
    const [showEditWebhook, setShowEditWebhook] = useState<string | null>(null);

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Settings", href: "/dashboard/settings", icon: "fa-sliders" },
        { label: "API Keys", icon: "fa-key" }
    ];

    const loadData = useCallback(async () => {
        if (!tenantId) return;

        try {
            const [apiKeysRes, webhooksRes] = await Promise.all([
                fetch('/api/api-keys'),
                fetch('/api/webhooks')
            ]);

            if (apiKeysRes.ok) {
                const apiKeysData = await apiKeysRes.json();
                setApiKeys(apiKeysData);
            }

            if (webhooksRes.ok) {
                const webhooksData = await webhooksRes.json();
                setWebhooks(webhooksData);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        loadData();
    }, [tenantId, loadData]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toastUtils.copied();
    };

    const deleteApiKey = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete API key');
            }

            toastUtils.success('API key deleted successfully');
            loadData();
        } catch (error) {
            console.error('Error deleting API key:', error);
            toastUtils.error(error instanceof Error ? error.message : 'Failed to delete API key');
        }
    };

    const rotateApiKey = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to rotate the key for "${name}"? The old key will stop working immediately.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/api-keys/${id}/rotate`, { method: 'POST' });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to rotate API key');
            }

            const result = await response.json();
            toastUtils.success('API key rotated successfully');

            // Copy new key to clipboard
            if (result.key) {
                await navigator.clipboard.writeText(result.key);
                toastUtils.success('New API key copied to clipboard - save it securely!');
            }

            loadData();
        } catch (error) {
            console.error('Error rotating API key:', error);
            toastUtils.error(error instanceof Error ? error.message : 'Failed to rotate API key');
        }
    };

    const deleteWebhook = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete webhook');
            }

            toastUtils.success('Webhook deleted successfully');
            loadData();
        } catch (error) {
            console.error('Error deleting webhook:', error);
            toastUtils.error(error instanceof Error ? error.message : 'Failed to delete webhook');
        }
    };

    const testWebhook = async (id: string, name: string) => {
        try {
            const response = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to test webhook');
            }

            toastUtils.success(`Test event sent to "${name}" successfully`);
        } catch (error) {
            console.error('Error testing webhook:', error);
            toastUtils.error(error instanceof Error ? error.message : 'Failed to test webhook');
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getKeyTypeIcon = (type: string) => {
        switch (type) {
            case 'public': return 'fa-eye';
            case 'secret': return 'fa-lock';
            case 'webhook': return 'fa-webhook';
            default: return 'fa-key';
        }
    };

    const getKeyTypeColor = (type: string) => {
        switch (type) {
            case 'public': return 'text-info';
            case 'secret': return 'text-success';
            case 'webhook': return 'text-warning';
            default: return 'text-base-content';
        }
    };

    if (!tenantId) {
        return <div className="text-center py-8">Loading...</div>;
    }

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
                                <h1 className="text-3xl font-bold text-base-content">API Keys & Webhooks</h1>
                                <p className="text-base-content/60 mt-2">
                                    Manage API keys for programmatic access and webhook endpoints for real-time notifications
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {activeTab === 'api-keys' && (
                                    <button
                                        className="btn btn-primary rounded-xl"
                                        onClick={() => setShowCreateApiKey(true)}
                                    >
                                        <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                        New API Key
                                    </button>
                                )}
                                {activeTab === 'webhooks' && (
                                    <button
                                        className="btn btn-primary rounded-xl"
                                        onClick={() => setShowCreateWebhook(true)}
                                    >
                                        <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                        New Webhook
                                    </button>
                                )}
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* API Key Guidance */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="alert alert-info">
                            <i className="fa-duotone fa-solid fa-lightbulb text-xl" aria-hidden />
                            <div>
                                <div className="font-semibold mb-1">Managed API Keys vs Widget Keys</div>
                                <div className="text-sm opacity-90">
                                    These are <strong>managed API keys</strong> for programmatic access to helpNINJA APIs with granular permissions and usage tracking.
                                    For basic chat widget integration, use the simpler{' '}
                                    <a href="/dashboard/settings" className="link link-primary">Widget Keys</a> found in your main settings.
                                </div>
                                <div className="mt-2 text-sm opacity-80">
                                    <strong>Key Types:</strong> Public keys for read operations, Secret keys for write operations, Webhook keys for endpoint authentication.
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Stats */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                            <StatCard
                                title="API Keys"
                                value={apiKeys.length}
                                description={`${apiKeys.filter(k => !k.is_expired).length} active`}
                                icon="fa-key"
                                color="primary"
                            />

                            <StatCard
                                title="Webhooks"
                                value={webhooks.length}
                                description={`${webhooks.filter(w => w.is_active).length} active`}
                                icon="fa-webhook"
                                color="secondary"
                            />

                            <StatCard
                                title="Total Requests"
                                value={apiKeys.reduce((sum, key) => sum + key.usage_count, 0).toLocaleString()}
                                description="API calls made"
                                icon="fa-chart-line"
                                color="info"
                            />

                            <StatCard
                                title="Webhook Success"
                                value={`${webhooks.length > 0
                                    ? Math.round(webhooks.reduce((sum, w) => sum + w.stats.success_rate, 0) / webhooks.length)
                                    : 100
                                    }%`}
                                description="Delivery rate"
                                icon="fa-check-circle"
                                color="success"
                            />
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Tabs */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="tabs tabs-bordered">
                            <button
                                className={`tab tab-lg ${activeTab === 'api-keys' ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab('api-keys')}
                            >
                                <i className="fa-duotone fa-solid fa-key mr-2" aria-hidden />
                                API Keys ({apiKeys.length})
                            </button>
                            <button
                                className={`tab tab-lg ${activeTab === 'webhooks' ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab('webhooks')}
                            >
                                <i className="fa-duotone fa-solid fa-webhook mr-2" aria-hidden />
                                Webhooks ({webhooks.length})
                            </button>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <StaggerContainer>
                    <StaggerChild>
                        {activeTab === 'api-keys' && (
                            <div className="space-y-4">
                                {loading ? (
                                    <div className="space-y-4">
                                        {Array.from({ length: 3 }, (_, i) => (
                                            <div key={i} className="animate-pulse bg-base-300/60 h-24 rounded-xl"></div>
                                        ))}
                                    </div>
                                ) : apiKeys.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                                            <i className="fa-duotone fa-solid fa-key text-2xl text-base-content/40" aria-hidden />
                                        </div>
                                        <h3 className="font-semibold text-lg mb-2">No API Keys Found</h3>
                                        <p className="text-base-content/60 mb-4">
                                            Create your first API key to access the helpNINJA API programmatically
                                        </p>
                                        <button
                                            className="btn btn-primary rounded-xl"
                                            onClick={() => setShowCreateApiKey(true)}
                                        >
                                            <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                            Create API Key
                                        </button>
                                    </div>
                                ) : (
                                    apiKeys.map((apiKey) => (
                                        <div key={apiKey.id} className="card bg-base-100 rounded-2xl shadow-sm">
                                            <div className="p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getKeyTypeColor(apiKey.key_type)} bg-base-200/60`}>
                                                            <i className={`fa-duotone fa-solid ${getKeyTypeIcon(apiKey.key_type)} text-lg`} aria-hidden />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h3 className="font-semibold text-base-content">{apiKey.name}</h3>
                                                                <div className="badge badge-neutral badge-sm capitalize">
                                                                    {apiKey.key_type}
                                                                </div>
                                                                {apiKey.is_expired && (
                                                                    <div className="badge badge-error badge-sm">Expired</div>
                                                                )}
                                                            </div>

                                                            <div className="font-mono text-sm bg-base-200/60 px-3 py-2 rounded-lg mb-3 flex items-center justify-between">
                                                                <span>{apiKey.key_prefix}</span>
                                                                <button
                                                                    className="btn btn-ghost btn-xs rounded-lg"
                                                                    onClick={() => copyToClipboard(apiKey.key_prefix)}
                                                                    title="Copy key prefix"
                                                                >
                                                                    <i className="fa-duotone fa-solid fa-copy" aria-hidden />
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                                <div>
                                                                    <span className="text-base-content/60">Usage:</span>
                                                                    <div className="font-medium">{apiKey.usage_count.toLocaleString()} calls</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-base-content/60">Rate Limit:</span>
                                                                    <div className="font-medium">{apiKey.rate_limit_per_hour}/hour</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-base-content/60">Last Used:</span>
                                                                    <div className="font-medium">{formatDate(apiKey.last_used_at)}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-base-content/60">Created:</span>
                                                                    <div className="font-medium">{formatDate(apiKey.created_at)}</div>
                                                                </div>
                                                            </div>

                                                            {apiKey.permissions.length > 0 && (
                                                                <div className="mt-3">
                                                                    <span className="text-base-content/60 text-sm">Permissions:</span>
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {apiKey.permissions.map((perm) => (
                                                                            <span key={perm} className="badge badge-outline badge-sm">
                                                                                {perm}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="dropdown dropdown-end">
                                                        <button className="btn btn-ghost btn-sm btn-square rounded-lg">
                                                            <i className="fa-duotone fa-solid fa-ellipsis-vertical" aria-hidden />
                                                        </button>
                                                        <div className="dropdown-content z-10 menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-300">
                                                            <button
                                                                className="btn btn-ghost btn-sm justify-start rounded-lg"
                                                                onClick={() => rotateApiKey(apiKey.id, apiKey.name)}
                                                            >
                                                                <i className="fa-duotone fa-solid fa-rotate mr-2" aria-hidden />
                                                                Rotate Key
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-sm justify-start rounded-lg"
                                                                onClick={() => setShowEditApiKey(apiKey.id)}
                                                            >
                                                                <i className="fa-duotone fa-solid fa-edit mr-2" aria-hidden />
                                                                Edit
                                                            </button>
                                                            <div className="divider my-1"></div>
                                                            <button
                                                                className="btn btn-ghost btn-sm justify-start text-error rounded-lg"
                                                                onClick={() => deleteApiKey(apiKey.id, apiKey.name)}
                                                            >
                                                                <i className="fa-duotone fa-solid fa-trash mr-2" aria-hidden />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'webhooks' && (
                            <div className="space-y-4">
                                {loading ? (
                                    <div className="space-y-4">
                                        {Array.from({ length: 3 }, (_, i) => (
                                            <div key={i} className="animate-pulse bg-base-300/60 h-24 rounded-xl"></div>
                                        ))}
                                    </div>
                                ) : webhooks.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                                            <i className="fa-duotone fa-solid fa-webhook text-2xl text-base-content/40" aria-hidden />
                                        </div>
                                        <h3 className="font-semibold text-lg mb-2">No Webhooks Found</h3>
                                        <p className="text-base-content/60 mb-4">
                                            Create webhook endpoints to receive real-time notifications about events
                                        </p>
                                        <button
                                            className="btn btn-primary rounded-xl"
                                            onClick={() => setShowCreateWebhook(true)}
                                        >
                                            <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                            Create Webhook
                                        </button>
                                    </div>
                                ) : (
                                    webhooks.map((webhook) => (
                                        <div key={webhook.id} className="card bg-base-100 rounded-2xl shadow-sm">
                                            <div className="p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${webhook.is_active ? 'text-success bg-success/20' : 'text-base-content/40 bg-base-200/60'}`}>
                                                            <i className="fa-duotone fa-solid fa-webhook text-lg" aria-hidden />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h3 className="font-semibold text-base-content">{webhook.name}</h3>
                                                                {webhook.is_active ? (
                                                                    <div className="badge badge-success badge-sm">Active</div>
                                                                ) : (
                                                                    <div className="badge badge-error badge-sm">Disabled</div>
                                                                )}
                                                            </div>

                                                            <div className="text-sm text-base-content/70 mb-3">
                                                                <a href={webhook.url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                                                                    {webhook.url}
                                                                    <i className="fa-duotone fa-solid fa-external-link text-xs ml-1" aria-hidden />
                                                                </a>
                                                            </div>

                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                                                                <div>
                                                                    <span className="text-base-content/60">Success Rate:</span>
                                                                    <div className="font-medium text-success">{webhook.stats.success_rate}%</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-base-content/60">Deliveries:</span>
                                                                    <div className="font-medium">{webhook.stats.total_deliveries}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-base-content/60">Failures:</span>
                                                                    <div className="font-medium text-error">{webhook.failure_count}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-base-content/60">Last Success:</span>
                                                                    <div className="font-medium">{formatDate(webhook.last_success_at)}</div>
                                                                </div>
                                                            </div>

                                                            {webhook.events.length > 0 && (
                                                                <div>
                                                                    <span className="text-base-content/60 text-sm">Events:</span>
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {webhook.events.map((event) => (
                                                                            <span key={event} className="badge badge-outline badge-sm">
                                                                                {event}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="dropdown dropdown-end">
                                                        <button className="btn btn-ghost btn-sm btn-square rounded-lg">
                                                            <i className="fa-duotone fa-solid fa-ellipsis-vertical" aria-hidden />
                                                        </button>
                                                        <div className="dropdown-content z-10 menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-300">
                                                            <button
                                                                className="btn btn-ghost btn-sm justify-start rounded-lg"
                                                                onClick={() => testWebhook(webhook.id, webhook.name)}
                                                            >
                                                                <i className="fa-duotone fa-solid fa-play mr-2" aria-hidden />
                                                                Test Webhook
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-sm justify-start rounded-lg"
                                                                onClick={() => setShowEditWebhook(webhook.id)}
                                                            >
                                                                <i className="fa-duotone fa-solid fa-edit mr-2" aria-hidden />
                                                                Edit
                                                            </button>
                                                            <div className="divider my-1"></div>
                                                            <button
                                                                className="btn btn-ghost btn-sm justify-start text-error rounded-lg"
                                                                onClick={() => deleteWebhook(webhook.id, webhook.name)}
                                                            >
                                                                <i className="fa-duotone fa-solid fa-trash mr-2" aria-hidden />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </StaggerChild>
                </StaggerContainer>

                {/* Documentation */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-book text-lg text-primary" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-base-content">Integration Guide</h2>
                                        <p className="text-base-content/60 text-sm">Complete guide for helpNINJA API integration</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* API Endpoints */}
                                    <div>
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <i className="fa-duotone fa-solid fa-code text-primary" aria-hidden />
                                            API Endpoints
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            <div className="p-3 bg-base-200/30 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="badge badge-primary badge-sm">POST</span>
                                                    <code className="text-xs">/api/chat</code>
                                                </div>
                                                <p className="text-base-content/70">Send messages to the AI assistant</p>
                                            </div>
                                            <div className="p-3 bg-base-200/30 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="badge badge-secondary badge-sm">GET</span>
                                                    <code className="text-xs">/api/documents</code>
                                                </div>
                                                <p className="text-base-content/70">List and search knowledge base documents</p>
                                            </div>
                                            <div className="p-3 bg-base-200/30 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="badge badge-accent badge-sm">POST</span>
                                                    <code className="text-xs">/api/ingest</code>
                                                </div>
                                                <p className="text-base-content/70">Add new content to knowledge base</p>
                                            </div>
                                            <div className="p-3 bg-base-200/30 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="badge badge-info badge-sm">GET</span>
                                                    <code className="text-xs">/api/conversations</code>
                                                </div>
                                                <p className="text-base-content/70">Retrieve chat conversation history</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Authentication */}
                                    <div>
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <i className="fa-duotone fa-solid fa-shield-check text-success" aria-hidden />
                                            Authentication
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <p className="mb-2">Include your API key in request headers:</p>
                                                <div className="mockup-code text-xs bg-base-300/60">
                                                    <pre><code>Authorization: Bearer sk_your_secret_key</code></pre>
                                                    <pre><code>Content-Type: application/json</code></pre>
                                                </div>
                                            </div>
                                            <div className="alert alert-warning alert-sm">
                                                <i className="fa-duotone fa-solid fa-exclamation-triangle" aria-hidden />
                                                <span className="text-xs">Never expose secret keys in client-side code</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Key Management */}
                                    <div>
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <i className="fa-duotone fa-solid fa-key text-warning" aria-hidden />
                                            Best Practices
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            <div className="space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <i className="fa-duotone fa-solid fa-check text-success mt-0.5" aria-hidden />
                                                    <span>Use descriptive names for your API keys</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <i className="fa-duotone fa-solid fa-check text-success mt-0.5" aria-hidden />
                                                    <span>Set appropriate permissions for each key</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <i className="fa-duotone fa-solid fa-check text-success mt-0.5" aria-hidden />
                                                    <span>Monitor usage and rotate keys regularly</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <i className="fa-duotone fa-solid fa-check text-success mt-0.5" aria-hidden />
                                                    <span>Use environment variables for key storage</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <i className="fa-duotone fa-solid fa-check text-success mt-0.5" aria-hidden />
                                                    <span>Set rate limits to prevent abuse</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Start */}
                                <div className="mt-6 pt-6 border-t border-base-300">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <i className="fa-duotone fa-solid fa-rocket text-info" aria-hidden />
                                        Quick Start Example
                                    </h3>
                                    <div className="mockup-code text-xs">
                                        <pre><code># Send a message to the AI assistant</code></pre>
                                        <pre><code>curl -X POST https://yourdomain.com/api/chat \</code></pre>
                                        <pre><code>  -H &quot;Authorization: Bearer sk_your_secret_key&quot; \</code></pre>
                                        <pre><code>  -H &quot;Content-Type: application/json&quot; \</code></pre>
                                        <pre><code>  -d &apos;{`{`}&quot;message&quot;: &quot;Hello&quot;, &quot;sessionId&quot;: &quot;session_123&quot;{`}`}&apos;</code></pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Create API Key Modal */}
                {showCreateApiKey && (
                    <CreateApiKeyModal
                        onClose={() => setShowCreateApiKey(false)}
                        onSuccess={() => {
                            setShowCreateApiKey(false);
                            loadData();
                        }}
                    />
                )}

                {/* Create Webhook Modal */}
                {showCreateWebhook && (
                    <CreateWebhookModal
                        onClose={() => setShowCreateWebhook(false)}
                        onSuccess={() => {
                            setShowCreateWebhook(false);
                            loadData();
                        }}
                    />
                )}

                {/* Edit API Key Modal */}
                {showEditApiKey && (
                    <EditApiKeyModal
                        apiKeyId={showEditApiKey}
                        onClose={() => setShowEditApiKey(null)}
                        onSuccess={() => {
                            setShowEditApiKey(null);
                            loadData();
                        }}
                    />
                )}

                {/* Edit Webhook Modal */}
                {showEditWebhook && (
                    <EditWebhookModal
                        webhookId={showEditWebhook}
                        onClose={() => setShowEditWebhook(null)}
                        onSuccess={() => {
                            setShowEditWebhook(null);
                            loadData();
                        }}
                    />
                )}
            </div>
        </AnimatedPage>
    );
}

// Create API Key Modal Component
function CreateApiKeyModal({
    onClose,
    onSuccess
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        keyType: 'secret' as 'public' | 'secret' | 'webhook',
        permissions: [] as string[],
        rateLimitPerHour: 1000,
        expiresInDays: 0 // 0 means never expires
    });

    const availablePermissions = [
        { id: 'chat.send', label: 'Send Chat Messages', description: 'Allow sending messages to the AI assistant' },
        { id: 'documents.read', label: 'Read Documents', description: 'Access and search knowledge base documents' },
        { id: 'documents.write', label: 'Write Documents', description: 'Add and modify knowledge base content' },
        { id: 'analytics.read', label: 'Read Analytics', description: 'Access usage and performance metrics' },
        { id: 'webhooks.send', label: 'Send Webhooks', description: 'Trigger webhook deliveries' }
    ];

    const handlePermissionToggle = (permissionId: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permissionId)
                ? prev.permissions.filter(p => p !== permissionId)
                : [...prev.permissions, permissionId]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toastUtils.error('API key name is required');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    keyType: formData.keyType,
                    permissions: formData.permissions,
                    rateLimitPerHour: formData.rateLimitPerHour,
                    expiresInDays: formData.expiresInDays || undefined
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create API key');
            }

            const result = await response.json();
            toastUtils.success('API key created successfully');

            // Show the full key only once
            const fullKey = result.key;
            if (fullKey) {
                // Copy to clipboard automatically
                await navigator.clipboard.writeText(fullKey);
                toastUtils.success('API key copied to clipboard - save it securely!');
            }

            onSuccess();
        } catch (error) {
            console.error('Error creating API key:', error);
            toastUtils.error(error instanceof Error ? error.message : 'Failed to create API key');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-base-content">Create API Key</h2>
                        <button
                            className="btn btn-ghost btn-sm btn-square rounded-lg"
                            onClick={onClose}
                            disabled={loading}
                        >
                            <i className="fa-duotone fa-solid fa-times" aria-hidden />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <div>
                                <label className="label">
                                    <span className="label-text font-medium">API Key Name</span>
                                    <span className="label-text-alt text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="e.g., Production API Key"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    disabled={loading}
                                />
                                <label className="label">
                                    <span className="label-text-alt">Choose a descriptive name to identify this key</span>
                                </label>
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text font-medium">Key Type</span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.keyType}
                                    onChange={(e) => setFormData(prev => ({ ...prev, keyType: e.target.value as 'public' | 'secret' | 'webhook' }))}
                                    disabled={loading}
                                >
                                    <option value="secret">Secret Key (Full Access)</option>
                                    <option value="public">Public Key (Read Only)</option>
                                    <option value="webhook">Webhook Key (Event Handling)</option>
                                </select>
                                <label className="label">
                                    <span className="label-text-alt">
                                        {formData.keyType === 'secret' && 'For server-side operations with write access'}
                                        {formData.keyType === 'public' && 'For client-side operations, read-only access'}
                                        {formData.keyType === 'webhook' && 'For webhook endpoint authentication'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Permissions */}
                        <div>
                            <label className="label">
                                <span className="label-text font-medium">Permissions</span>
                            </label>
                            <div className="space-y-3">
                                {availablePermissions.map((permission) => (
                                    <div key={permission.id} className="flex items-start gap-3 p-3 border border-base-300 rounded-lg">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-primary mt-1"
                                            checked={formData.permissions.includes(permission.id)}
                                            onChange={() => handlePermissionToggle(permission.id)}
                                            disabled={loading}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-base-content">{permission.label}</div>
                                            <div className="text-sm text-base-content/60">{permission.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Advanced Settings */}
                        <div className="space-y-4">
                            <div>
                                <label className="label">
                                    <span className="label-text font-medium">Rate Limit (requests per hour)</span>
                                </label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full"
                                    min="1"
                                    max="10000"
                                    value={formData.rateLimitPerHour}
                                    onChange={(e) => setFormData(prev => ({ ...prev, rateLimitPerHour: parseInt(e.target.value) || 1000 }))}
                                    disabled={loading}
                                />
                                <label className="label">
                                    <span className="label-text-alt">Maximum requests allowed per hour (1-10,000)</span>
                                </label>
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text font-medium">Expiration</span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={formData.expiresInDays}
                                    onChange={(e) => setFormData(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) }))}
                                    disabled={loading}
                                >
                                    <option value={0}>Never expires</option>
                                    <option value={30}>30 days</option>
                                    <option value={90}>90 days</option>
                                    <option value={365}>1 year</option>
                                </select>
                            </div>
                        </div>

                        {/* Security Warning */}
                        <div className="alert alert-warning">
                            <i className="fa-duotone fa-solid fa-exclamation-triangle" aria-hidden />
                            <div>
                                <div className="font-semibold">Security Notice</div>
                                <div className="text-sm">
                                    Your API key will be shown only once after creation. Copy and store it securely immediately.
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                className="btn btn-ghost rounded-xl"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary rounded-xl"
                                disabled={loading || !formData.name.trim()}
                            >
                                {loading && <span className="loading loading-spinner loading-sm"></span>}
                                Create API Key
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Create Webhook Modal Component
function CreateWebhookModal({
    onClose,
    onSuccess
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        events: [] as string[],
        generateSecret: true
    });

    const availableEvents = [
        { id: 'conversation.started', label: 'Conversation Started', description: 'When a new chat conversation begins' },
        { id: 'conversation.ended', label: 'Conversation Ended', description: 'When a chat conversation is completed' },
        { id: 'message.sent', label: 'Message Sent', description: 'When a user or assistant message is sent' },
        { id: 'escalation.triggered', label: 'Escalation Triggered', description: 'When a conversation is escalated to human support' },
        { id: 'rule.matched', label: 'Rule Matched', description: 'When an escalation rule is triggered' },
        { id: 'document.ingested', label: 'Document Ingested', description: 'When new content is added to the knowledge base' },
        { id: 'site.verified', label: 'Site Verified', description: 'When a website domain is verified' }
    ];

    const handleEventToggle = (eventId: string) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events.includes(eventId)
                ? prev.events.filter(e => e !== eventId)
                : [...prev.events, eventId]
        }));
    };

    const validateUrl = (url: string) => {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toastUtils.error('Webhook name is required');
            return;
        }

        if (!formData.url.trim()) {
            toastUtils.error('Webhook URL is required');
            return;
        }

        if (!validateUrl(formData.url)) {
            toastUtils.error('Please enter a valid HTTPS URL');
            return;
        }

        if (formData.events.length === 0) {
            toastUtils.error('Please select at least one event');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/webhooks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    url: formData.url.trim(),
                    events: formData.events,
                    generateSecret: formData.generateSecret
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create webhook');
            }

            const result = await response.json();
            toastUtils.success('Webhook created successfully');

            // Show the secret if generated
            if (result.secret) {
                await navigator.clipboard.writeText(result.secret);
                toastUtils.success('Webhook secret copied to clipboard - save it securely!');
            }

            onSuccess();
        } catch (error) {
            console.error('Error creating webhook:', error);
            toastUtils.error(error instanceof Error ? error.message : 'Failed to create webhook');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-base-content">Create Webhook</h2>
                        <button
                            className="btn btn-ghost btn-sm btn-square rounded-lg"
                            onClick={onClose}
                            disabled={loading}
                        >
                            <i className="fa-duotone fa-solid fa-times" aria-hidden />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <div>
                                <label className="label">
                                    <span className="label-text font-medium">Webhook Name</span>
                                    <span className="label-text-alt text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="e.g., Slack Support Notifications"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="label">
                                    <span className="label-text font-medium">Webhook URL</span>
                                    <span className="label-text-alt text-error">*</span>
                                </label>
                                <input
                                    type="url"
                                    className="input input-bordered w-full"
                                    placeholder="https://your-server.com/webhook"
                                    value={formData.url}
                                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                    required
                                    disabled={loading}
                                />
                                <label className="label">
                                    <span className="label-text-alt">Must be a valid HTTPS URL</span>
                                </label>
                            </div>
                        </div>

                        {/* Events */}
                        <div>
                            <label className="label">
                                <span className="label-text font-medium">Events to Subscribe</span>
                                <span className="label-text-alt text-error">*</span>
                            </label>
                            <div className="space-y-3">
                                {availableEvents.map((event) => (
                                    <div key={event.id} className="flex items-start gap-3 p-3 border border-base-300 rounded-lg">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-primary mt-1"
                                            checked={formData.events.includes(event.id)}
                                            onChange={() => handleEventToggle(event.id)}
                                            disabled={loading}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-base-content">{event.label}</div>
                                            <div className="text-sm text-base-content/60">{event.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Security */}
                        <div>
                            <label className="label">
                                <span className="label-text font-medium">Security</span>
                            </label>
                            <div className="flex items-start gap-3 p-3 border border-base-300 rounded-lg">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary mt-1"
                                    checked={formData.generateSecret}
                                    onChange={(e) => setFormData(prev => ({ ...prev, generateSecret: e.target.checked }))}
                                    disabled={loading}
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-base-content">Generate Webhook Secret</div>
                                    <div className="text-sm text-base-content/60">
                                        Creates a secret key for verifying webhook authenticity (recommended)
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="alert alert-info">
                            <i className="fa-duotone fa-solid fa-info-circle" aria-hidden />
                            <div>
                                <div className="font-semibold">Webhook Delivery</div>
                                <div className="text-sm">
                                    Events will be sent as HTTP POST requests with JSON payloads. Failed deliveries will be retried automatically.
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                className="btn btn-ghost rounded-xl"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary rounded-xl"
                                disabled={loading || !formData.name.trim() || !formData.url.trim() || formData.events.length === 0}
                            >
                                {loading && <span className="loading loading-spinner loading-sm"></span>}
                                Create Webhook
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Placeholder components for edit modals (we'll implement these next)
function EditApiKeyModal({ onClose }: { apiKeyId: string; onClose: () => void; onSuccess: () => void; }) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">Edit API Key</h2>
                <p className="text-base-content/60 mb-4">Edit functionality coming soon...</p>
                <button className="btn btn-ghost rounded-xl" onClick={onClose}>Close</button>
            </div>
        </div>
    );
}

function EditWebhookModal({ onClose }: { webhookId: string; onClose: () => void; onSuccess: () => void; }) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">Edit Webhook</h2>
                <p className="text-base-content/60 mb-4">Edit functionality coming soon...</p>
                <button className="btn btn-ghost rounded-xl" onClick={onClose}>Close</button>
            </div>
        </div>
    );
}
