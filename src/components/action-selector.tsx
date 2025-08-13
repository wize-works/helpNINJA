"use client";

import { useState, useEffect } from 'react';
import { HoverScale } from './ui/animated-page';
import { toastUtils } from '@/lib/toast';

type Integration = {
    id: string;
    provider: string;
    name: string;
    status: string;
};

type Destination = {
    type: 'integration' | 'email' | 'webhook';
    integrationId?: string;
    email?: string;
    webhookUrl?: string;
    template?: string;
    config?: Record<string, unknown>;
};

interface ActionSelectorProps {
    tenantId: string;
    destinations: Destination[];
    onChange: (destinations: Destination[]) => void;
    disabled?: boolean;
}

export default function ActionSelector({
    tenantId,
    destinations,
    onChange,
    disabled = false
}: ActionSelectorProps) {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newDestination, setNewDestination] = useState<Destination>({
        type: 'integration',
        template: 'User needs help with: {{message}}\nConfidence: {{confidence}}\nTime: {{timestamp}}'
    });

    useEffect(() => {
        loadIntegrations();
    }, [tenantId]);

    const loadIntegrations = async () => {
        try {
            const response = await fetch('/api/integrations', {
                headers: { 'x-tenant-id': tenantId }
            });
            if (response.ok) {
                const data = await response.json();
                setIntegrations(data.filter((i: Integration) => i.status === 'active'));
            }
        } catch (error) {
            console.error('Error loading integrations:', error);
        } finally {
            setLoading(false);
        }
    };

    const addDestination = () => {
        if (newDestination.type === 'integration' && !newDestination.integrationId) {
            toastUtils.validation('Please select an integration');
            return;
        }
        if (newDestination.type === 'email' && !newDestination.email) {
            toastUtils.validation('Please enter an email address');
            return;
        }
        if (newDestination.type === 'webhook' && !newDestination.webhookUrl) {
            toastUtils.validation('Please enter a webhook URL');
            return;
        }

        onChange([...destinations, { ...newDestination }]);
        setNewDestination({
            type: 'integration',
            template: 'User needs help with: {{message}}\nConfidence: {{confidence}}\nTime: {{timestamp}}'
        });
        setShowAddForm(false);
    };

    const removeDestination = (index: number) => {
        onChange(destinations.filter((_, i) => i !== index));
    };

    const updateDestination = (index: number, updates: Partial<Destination>) => {
        const updated = destinations.map((dest, i) =>
            i === index ? { ...dest, ...updates } : dest
        );
        onChange(updated);
    };

    const getDestinationIcon = (type: string) => {
        switch (type) {
            case 'integration': return 'fa-puzzle-piece';
            case 'email': return 'fa-envelope';
            case 'webhook': return 'fa-webhook';
            default: return 'fa-paper-plane';
        }
    };

    const getIntegrationIcon = (provider: string) => {
        switch (provider) {
            case 'slack': return 'fa-slack';
            case 'email': return 'fa-envelope';
            case 'teams': return 'fa-microsoft';
            default: return 'fa-puzzle-piece';
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse bg-base-300/60 h-12 rounded-xl"></div>
                <div className="animate-pulse bg-base-300/60 h-8 rounded-xl w-1/3"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Existing Destinations */}
            {destinations.length > 0 && (
                <div className="space-y-3">
                    {destinations.map((destination, index) => (
                        <div key={index} className="bg-base-200/40 border border-base-300 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 bg-base-100 rounded-lg flex items-center justify-center border border-base-300">
                                        <i className={`fa-duotone fa-solid ${getDestinationIcon(destination.type)} text-primary`} aria-hidden />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">
                                            {destination.type === 'integration' && destination.integrationId && (
                                                <>
                                                    {integrations.find(i => i.id === destination.integrationId)?.name || 'Unknown Integration'}
                                                    <span className="ml-2 text-xs opacity-60">
                                                        ({integrations.find(i => i.id === destination.integrationId)?.provider})
                                                    </span>
                                                </>
                                            )}
                                            {destination.type === 'email' && destination.email}
                                            {destination.type === 'webhook' && (
                                                <span className="text-xs font-mono">{destination.webhookUrl}</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-base-content/60 capitalize">
                                            {destination.type} destination
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => {
                                            // TODO: Show edit modal
                                        }}
                                        disabled={disabled}
                                        title="Edit destination"
                                    >
                                        <i className="fa-duotone fa-solid fa-edit" aria-hidden />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-ghost text-error"
                                        onClick={() => removeDestination(index)}
                                        disabled={disabled}
                                        title="Remove destination"
                                    >
                                        <i className="fa-duotone fa-solid fa-trash" aria-hidden />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add New Destination */}
            {!showAddForm ? (
                <div className="text-center py-6">
                    {destinations.length === 0 && (
                        <div className="mb-4">
                            <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <i className="fa-duotone fa-solid fa-paper-plane text-xl text-base-content/40" aria-hidden />
                            </div>
                            <p className="text-base-content/60 text-sm">No destinations configured</p>
                        </div>
                    )}
                    <HoverScale scale={1.02}>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setShowAddForm(true)}
                            disabled={disabled}
                        >
                            <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                            Add Destination
                        </button>
                    </HoverScale>
                </div>
            ) : (
                <div className="card bg-base-200/40 border border-base-300">
                    <div className="card-body">
                        <h4 className="card-title text-lg">Add Destination</h4>

                        <div className="space-y-4">
                            {/* Destination Type */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Destination Type</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { type: 'integration', label: 'Integration', icon: 'fa-puzzle-piece' },
                                        { type: 'email', label: 'Email', icon: 'fa-envelope' },
                                        { type: 'webhook', label: 'Webhook', icon: 'fa-webhook' }
                                    ].map((option) => (
                                        <button
                                            key={option.type}
                                            type="button"
                                            className={`btn btn-sm ${newDestination.type === option.type ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => setNewDestination({ ...newDestination, type: option.type as any })}
                                            disabled={disabled}
                                        >
                                            <i className={`fa-duotone fa-solid ${option.icon} mr-2`} aria-hidden />
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Integration Selection */}
                            {newDestination.type === 'integration' && (
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Select Integration</span>
                                    </label>
                                    {integrations.length === 0 ? (
                                        <div className="text-center py-4 text-base-content/60">
                                            <p className="mb-2">No active integrations found</p>
                                            <a href="/dashboard/integrations" className="btn btn-sm btn-outline">
                                                <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                Set Up Integrations
                                            </a>
                                        </div>
                                    ) : (
                                        <select
                                            className="select select-bordered"
                                            value={newDestination.integrationId || ''}
                                            onChange={(e) => setNewDestination({
                                                ...newDestination,
                                                integrationId: e.target.value
                                            })}
                                            disabled={disabled}
                                        >
                                            <option value="">Choose an integration...</option>
                                            {integrations.map((integration) => (
                                                <option key={integration.id} value={integration.id}>
                                                    {integration.name} ({integration.provider})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Email Input */}
                            {newDestination.type === 'email' && (
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Email Address</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="input input-bordered"
                                        placeholder="support@company.com"
                                        value={newDestination.email || ''}
                                        onChange={(e) => setNewDestination({
                                            ...newDestination,
                                            email: e.target.value
                                        })}
                                        disabled={disabled}
                                    />
                                </div>
                            )}

                            {/* Webhook Input */}
                            {newDestination.type === 'webhook' && (
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Webhook URL</span>
                                    </label>
                                    <input
                                        type="url"
                                        className="input input-bordered"
                                        placeholder="https://api.example.com/webhook"
                                        value={newDestination.webhookUrl || ''}
                                        onChange={(e) => setNewDestination({
                                            ...newDestination,
                                            webhookUrl: e.target.value
                                        })}
                                        disabled={disabled}
                                    />
                                </div>
                            )}

                            {/* Message Template */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Message Template</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered h-24"
                                    placeholder="Customize the message that will be sent..."
                                    value={newDestination.template || ''}
                                    onChange={(e) => setNewDestination({
                                        ...newDestination,
                                        template: e.target.value
                                    })}
                                    disabled={disabled}
                                />
                                <label className="label">
                                    <span className="label-text-alt">
                                        Use variables: {{ message }}, {{ confidence }}, {{ timestamp }}, {{ userEmail }}
                                    </span>
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={addDestination}
                                    disabled={disabled}
                                >
                                    Add Destination
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setShowAddForm(false)}
                                    disabled={disabled}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
