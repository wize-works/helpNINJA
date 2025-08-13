"use client";

import { useState, useEffect } from 'react';
import { useTenant } from "@/components/tenant-context";
import { HoverScale, StaggerContainer, StaggerChild, FadeIn } from "@/components/ui/animated-page";

type IntegrationHealthData = {
    id: string;
    name: string;
    provider: string;
    status: 'active' | 'error' | 'warning' | 'disabled';
    lastDelivery: string | null;
    successRate: number;
    totalDeliveries: number;
    failedDeliveries: number;
    avgResponseTime: number;
    uptime: number;
    webhook_endpoint_id?: string;
};

type IntegrationHealthResponse = {
    integrations: IntegrationHealthData[];
    overall: {
        totalIntegrations: number;
        activeIntegrations: number;
        averageUptime: number;
        averageSuccessRate: number;
        totalDeliveries: number;
        failedDeliveries: number;
    };
    trends: Array<{
        date: string;
        totalDeliveries: number;
        successfulDeliveries: number;
        failedDeliveries: number;
        averageResponseTime: number;
    }>;
};

export function IntegrationHealthDashboard() {
    const { tenantId } = useTenant();
    const [data, setData] = useState<IntegrationHealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenantId) return;

        async function fetchData() {
            try {
                setLoading(true);
                const response = await fetch('/api/analytics/integration-health', {
                    headers: { 'x-tenant-id': tenantId }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch integration health data');
                }

                const result = await response.json();
                setData(result);
                setError(null);
            } catch (err) {
                console.error('Error fetching integration health:', err);
                setError('Failed to load integration health data');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
        // Refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [tenantId]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="skeleton h-32 w-full"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="skeleton h-24 w-full"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="card bg-base-100 p-8 text-center">
                <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-duotone fa-solid fa-triangle-exclamation text-2xl text-error" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Unable to Load Integration Health</h3>
                <p className="text-base-content/60">{error || 'An unexpected error occurred'}</p>
            </div>
        );
    }

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'slack': return 'fa-brands fa-slack';
            case 'email': return 'fa-duotone fa-solid fa-envelope';
            case 'teams': return 'fa-brands fa-microsoft';
            case 'discord': return 'fa-brands fa-discord';
            case 'webhook': return 'fa-duotone fa-solid fa-webhook';
            default: return 'fa-duotone fa-solid fa-plug';
        }
    };

    const getStatusColor = (status: string, successRate: number) => {
        if (status !== 'active') return 'success';
        if (successRate >= 95) return 'success';
        if (successRate >= 85) return 'info';
        return 'warning';
    };

    const getStatusBadge = (status: string, successRate: number) => {
        const color = getStatusColor(status, successRate);
        const colorMap = {
            success: 'badge-success',
            info: 'badge-info',
            warning: 'badge-warning',
            error: 'badge-error'
        };
        return colorMap[color];
    };

    return (
        <div className="space-y-8">
            {/* Overall Health Summary */}
            <FadeIn>
                <div className="card bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-semibold text-base-content mb-2">Integration Health Overview</h3>
                            <p className="text-base-content/60">Real-time status of all connected services</p>
                        </div>
                        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-heart-pulse text-lg text-primary" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-base-content">{data.overall.activeIntegrations}</div>
                            <div className="text-sm text-base-content/70">Active</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-success">{(data.overall.averageUptime || 0).toFixed(1)}%</div>
                            <div className="text-sm text-base-content/70">Uptime</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-info">{data.overall.totalDeliveries || 0}</div>
                            <div className="text-sm text-base-content/70">Deliveries</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{(data.overall.averageSuccessRate || 0).toFixed(1)}%</div>
                            <div className="text-sm text-base-content/70">Success Rate</div>
                        </div>
                    </div>
                </div>
            </FadeIn>

            {/* Individual Integration Status */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-base-content">Integration Status</h3>
                        <p className="text-sm text-base-content/60 mt-1">Detailed health metrics for each integration</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-base-content/60">
                        <i className="fa-duotone fa-solid fa-clock" />
                        <span>Updated every 30 seconds</span>
                    </div>
                </div>

                {data.integrations.length > 0 ? (
                    <StaggerContainer>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {data.integrations.map((integration) => (
                                <StaggerChild key={integration.id}>
                                    <HoverScale scale={1.01}>
                                        <div className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-all duration-300">
                                            <div className="card-body p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                                            <i className={`${getProviderIcon(integration.provider)} text-lg text-primary`} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-base-content">{integration.name}</h4>
                                                            <p className="text-sm text-base-content/60 capitalize">{integration.provider}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`badge ${getStatusBadge(integration.status, integration.successRate || 0)} badge-sm`}>
                                                        {integration.status}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <div className="text-base-content/70">Success Rate</div>
                                                        <div className="font-semibold text-base-content">{(integration.successRate || 0).toFixed(1)}%</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-base-content/70">Deliveries</div>
                                                        <div className="font-semibold text-base-content">{integration.totalDeliveries || 0}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-base-content/70">Response Time</div>
                                                        <div className="font-semibold text-base-content">{(integration.avgResponseTime || 0).toFixed(2)}s</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-base-content/70">Last Delivery</div>
                                                        <div className="font-semibold text-base-content">
                                                            {integration.lastDelivery
                                                                ? new Date(integration.lastDelivery).toLocaleDateString()
                                                                : 'Never'
                                                            }
                                                        </div>
                                                    </div>
                                                </div>

                                                {integration.failedDeliveries > 0 && (
                                                    <div className="mt-4 p-3 bg-warning/10 rounded-lg">
                                                        <div className="flex items-center gap-2 text-warning text-sm">
                                                            <i className="fa-duotone fa-solid fa-triangle-exclamation" />
                                                            <span>{integration.failedDeliveries} failed deliveries in the last 30 days</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </HoverScale>
                                </StaggerChild>
                            ))}
                        </div>
                    </StaggerContainer>
                ) : (
                    <div className="card bg-base-100 border-2 border-dashed border-base-300 p-12 text-center">
                        <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-duotone fa-solid fa-plug text-2xl text-base-content/40" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Integrations Found</h3>
                        <p className="text-base-content/60 mb-6">Set up integrations to monitor their health and performance</p>
                        <a href="/dashboard/integrations/marketplace" className="btn btn-primary">
                            <i className="fa-duotone fa-solid fa-plus mr-2" />
                            Browse Integrations
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
