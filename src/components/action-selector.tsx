"use client";

import { useState, useEffect } from 'react';
import { HoverScale } from './ui/animated-page';
import { toast } from '@/lib/toast';
import Link from 'next/link';

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
    tenantId: _tenantId, // Currently not used but kept for future implementation/consistency
    destinations,
    onChange,
    disabled = false
}: ActionSelectorProps) {
    void _tenantId; // suppress unused variable lint; reserved for future use
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newDestination, setNewDestination] = useState<Destination>({
        type: 'integration',
        template: 'User needs help with: {{message}}\nConfidence: {{confidence}}\nTime: {{timestamp}}'
    });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editDestination, setEditDestination] = useState<Destination | null>(null);

    useEffect(() => {
        loadIntegrations();
    }, []);

    const loadIntegrations = async () => {
        try {
            const response = await fetch('/api/integrations');
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
            toast.validation({ message: 'Please select an integration' });
            return;
        }
        if (newDestination.type === 'email' && !newDestination.email) {
            toast.validation({ message: 'Please enter an email address' });
            return;
        }
        if (newDestination.type === 'webhook' && !newDestination.webhookUrl) {
            toast.validation({ message: 'Please enter a webhook URL' });
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

    // Reserved for future inline editing support
    // const updateDestination = (index: number, updates: Partial<Destination>) => {
    //     const updated = destinations.map((dest, i) =>
    //         i === index ? { ...dest, ...updates } : dest
    //     );
    //     onChange(updated);
    // };

    const getDestinationIcon = (type: string) => {
        switch (type) {
            case 'integration': return 'fa-puzzle-piece';
            case 'email': return 'fa-envelope';
            case 'webhook': return 'fa-webhook';
            default: return 'fa-paper-plane';
        }
    };

    // const getIntegrationIcon = (provider: string) => {
    //     switch (provider) {
    //         case 'slack': return 'fa-slack';
    //         case 'email': return 'fa-envelope';
    //         case 'teams': return 'fa-microsoft';
    //         default: return 'fa-puzzle-piece';
    //     }
    // };

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
                        <div key={index} className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-xl border border-base-200/60 shadow-sm p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                                        <i className={`fa-duotone fa-solid ${getDestinationIcon(destination.type)} text-primary`} aria-hidden />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-base-content">
                                            {destination.type === 'integration' && destination.integrationId && (
                                                <>
                                                    {integrations.find(i => i.id === destination.integrationId)?.name || 'Unknown Integration'}
                                                    <span className="ml-2 text-xs text-base-content/60">
                                                        ({integrations.find(i => i.id === destination.integrationId)?.provider})
                                                    </span>
                                                </>
                                            )}
                                            {destination.type === 'email' && destination.email}
                                            {destination.type === 'webhook' && (
                                                <span className="text-xs font-mono text-base-content/70">{destination.webhookUrl}</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-base-content/60 capitalize mt-1">
                                            {destination.type} destination
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <HoverScale scale={1.05}>
                                        <button
                                            type="button"
                                            className="btn btn-sm  rounded-lg"
                                            onClick={() => {
                                                setEditingIndex(index);
                                                setEditDestination({ ...destination });
                                            }}
                                            disabled={disabled}
                                            title="Edit destination"
                                        >
                                            <i className="fa-duotone fa-solid fa-edit" aria-hidden />
                                        </button>
                                    </HoverScale>
                                    <HoverScale scale={1.05}>
                                        <button
                                            type="button"
                                            className="btn btn-sm  text-error rounded-lg"
                                            onClick={() => removeDestination(index)}
                                            disabled={disabled}
                                            title="Remove destination"
                                        >
                                            <i className="fa-duotone fa-solid fa-trash" aria-hidden />
                                        </button>
                                    </HoverScale>
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
                            className="btn btn-outline btn-primary rounded-xl"
                            onClick={() => setShowAddForm(true)}
                            disabled={disabled}
                        >
                            <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                            Add Destination
                        </button>
                    </HoverScale>
                </div>
            ) : (
                <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <i className="fa-duotone fa-solid fa-paper-plane text-lg text-primary" aria-hidden />
                            </div>
                            <div>
                                <h4 className="text-xl font-semibold text-base-content">Add Destination</h4>
                                <p className="text-base-content/60 text-sm">Configure where escalation notifications will be sent</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Destination Type */}
                            <fieldset className="space-y-4">
                                <legend className="text-base font-semibold text-base-content mb-4">Destination Type</legend>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { type: 'integration', label: 'Integration', icon: 'fa-puzzle-piece', desc: 'Send to connected services' },
                                        { type: 'email', label: 'Email', icon: 'fa-envelope', desc: 'Direct email notification' },
                                        { type: 'webhook', label: 'Webhook', icon: 'fa-webhook', desc: 'Custom API endpoint' }
                                    ].map((option) => (
                                        <button
                                            key={option.type}
                                            type="button"
                                            className={`p-4 rounded-xl border-2 transition-all duration-200 ${newDestination.type === option.type
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-base-300 bg-base-100/60 hover:border-base-400 hover:bg-base-200/40'
                                                }`}
                                            onClick={() => setNewDestination({ ...newDestination, type: option.type as 'integration' | 'email' | 'webhook' })}
                                            disabled={disabled}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <i className={`fa-duotone fa-solid ${option.icon} text-xl`} aria-hidden />
                                                <span className="font-medium text-sm">{option.label}</span>
                                                <span className="text-xs text-base-content/60 text-center">{option.desc}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            {/* Integration Selection */}
                            {newDestination.type === 'integration' && (
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">
                                        Select Integration
                                        <span className="text-error ml-1">*</span>
                                    </span>
                                    {integrations.length === 0 ? (
                                        <div className="text-center py-6 bg-base-200/40 rounded-xl border border-base-300">
                                            <div className="w-12 h-12 bg-base-300/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                                                <i className="fa-duotone fa-solid fa-puzzle-piece text-xl text-base-content/40" aria-hidden />
                                            </div>
                                            <p className="text-base-content/60 mb-3">No active integrations found</p>
                                            <Link href="/dashboard/integrations" className="btn btn-sm btn-outline rounded-lg">
                                                <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                Set Up Integrations
                                            </Link>
                                        </div>
                                    ) : (
                                        <select
                                            className="select select-bordered w-full focus:select-primary transition-all duration-200"
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
                                    <div className="text-xs text-base-content/60 mt-1">
                                        Choose which integration will receive the escalation notification
                                    </div>
                                </label>
                            )}

                            {/* Email Input */}
                            {newDestination.type === 'email' && (
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">
                                        Email Address
                                        <span className="text-error ml-1">*</span>
                                    </span>
                                    <input
                                        type="email"
                                        className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                        placeholder="support@company.com"
                                        value={newDestination.email || ''}
                                        onChange={(e) => setNewDestination({
                                            ...newDestination,
                                            email: e.target.value
                                        })}
                                        disabled={disabled}
                                    />
                                    <div className="text-xs text-base-content/60 mt-1">
                                        Enter the email address that will receive escalation notifications
                                    </div>
                                </label>
                            )}

                            {/* Webhook Input */}
                            {newDestination.type === 'webhook' && (
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">
                                        Webhook URL
                                        <span className="text-error ml-1">*</span>
                                    </span>
                                    <input
                                        type="url"
                                        className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                        placeholder="https://api.example.com/webhook"
                                        value={newDestination.webhookUrl || ''}
                                        onChange={(e) => setNewDestination({
                                            ...newDestination,
                                            webhookUrl: e.target.value
                                        })}
                                        disabled={disabled}
                                    />
                                    <div className="text-xs text-base-content/60 mt-1">
                                        Enter the webhook endpoint that will receive escalation data
                                    </div>
                                </label>
                            )}

                            {/* Message Template */}
                            <fieldset className="space-y-4">
                                <legend className="text-base font-semibold text-base-content mb-4">Message Template</legend>
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">Template Content</span>
                                    <textarea
                                        className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all duration-200 focus:scale-[1.02]"
                                        placeholder="Customize the message that will be sent..."
                                        value={newDestination.template || ''}
                                        onChange={(e) => setNewDestination({
                                            ...newDestination,
                                            template: e.target.value
                                        })}
                                        disabled={disabled}
                                    />
                                    <div className="text-xs text-base-content/60 mt-1">
                                        Use variables: &#123;&#123; message &#125;&#125;, &#123;&#123; confidence &#125;&#125;, &#123;&#123; timestamp &#125;&#125;, &#123;&#123; userEmail &#125;&#125;
                                    </div>
                                </label>
                            </fieldset>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-base-200/60">
                                <div className="text-sm text-base-content/60">
                                    Configure where and how escalation notifications will be sent
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        className="btn  rounded-xl"
                                        onClick={() => setShowAddForm(false)}
                                        disabled={disabled}
                                    >
                                        Cancel
                                    </button>

                                    <HoverScale scale={1.02}>
                                        <button
                                            type="button"
                                            className="btn btn-primary rounded-xl"
                                            onClick={addDestination}
                                            disabled={disabled}
                                        >
                                            <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                            Add Destination
                                        </button>
                                    </HoverScale>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Destination Modal */}
            {editingIndex !== null && editDestination && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => { setEditingIndex(null); setEditDestination(null); }} />
                    <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300/40">
                            <div className="flex items-center justify-between p-6 border-b border-base-300/40">
                                <div>
                                    <h2 className="text-xl font-semibold text-base-content">Edit Destination</h2>
                                    <p className="text-sm text-base-content/60 mt-1">Update where escalation notifications will be sent</p>
                                </div>
                                <button
                                    onClick={() => { setEditingIndex(null); setEditDestination(null); }}
                                    className="btn  btn-circle btn-sm"
                                    disabled={disabled}
                                >
                                    <i className="fa-duotone fa-solid fa-xmark text-lg" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Destination Type (read-only for simplicity) */}
                                <div>
                                    <label className="label"><span className="label-text font-medium">Destination Type</span></label>
                                    <input className="input input-bordered w-full" value={editDestination.type} disabled />
                                </div>

                                {/* Integration Selection */}
                                {editDestination.type === 'integration' && (
                                    <label className="block">
                                        <span className="text-sm font-medium text-base-content mb-2 block">Select Integration<span className="text-error ml-1">*</span></span>
                                        {integrations.length === 0 ? (
                                            <div className="text-center py-6 bg-base-200/40 rounded-xl border border-base-300">
                                                <div className="w-12 h-12 bg-base-300/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                                                    <i className="fa-duotone fa-solid fa-puzzle-piece text-xl text-base-content/40" aria-hidden />
                                                </div>
                                                <p className="text-base-content/60 mb-3">No active integrations found</p>
                                                <Link href="/dashboard/integrations" className="btn btn-sm btn-outline rounded-lg">
                                                    <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                    Set Up Integrations
                                                </Link>
                                            </div>
                                        ) : (
                                            <select
                                                className="select select-bordered w-full focus:select-primary transition-all duration-200"
                                                value={editDestination.integrationId || ''}
                                                onChange={(e) => setEditDestination({ ...editDestination, integrationId: e.target.value })}
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
                                    </label>
                                )}

                                {/* Email Input */}
                                {editDestination.type === 'email' && (
                                    <label className="block">
                                        <span className="text-sm font-medium text-base-content mb-2 block">Email Address<span className="text-error ml-1">*</span></span>
                                        <input
                                            type="email"
                                            className="input input-bordered w-full focus:input-primary transition-all duration-200"
                                            placeholder="support@company.com"
                                            value={editDestination.email || ''}
                                            onChange={(e) => setEditDestination({ ...editDestination, email: e.target.value })}
                                            disabled={disabled}
                                        />
                                    </label>
                                )}

                                {/* Webhook Input */}
                                {editDestination.type === 'webhook' && (
                                    <label className="block">
                                        <span className="text-sm font-medium text-base-content mb-2 block">Webhook URL<span className="text-error ml-1">*</span></span>
                                        <input
                                            type="url"
                                            className="input input-bordered w-full focus:input-primary transition-all duration-200"
                                            placeholder="https://api.example.com/webhook"
                                            value={editDestination.webhookUrl || ''}
                                            onChange={(e) => setEditDestination({ ...editDestination, webhookUrl: e.target.value })}
                                            disabled={disabled}
                                        />
                                    </label>
                                )}

                                {/* Message Template */}
                                <fieldset className="space-y-4">
                                    <legend className="text-base font-semibold text-base-content mb-2">Message Template</legend>
                                    <label className="block">
                                        <span className="text-sm font-medium text-base-content mb-2 block">Template Content</span>
                                        <textarea
                                            className="textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all duration-200"
                                            placeholder="Customize the message that will be sent..."
                                            value={editDestination.template || ''}
                                            onChange={(e) => setEditDestination({ ...editDestination, template: e.target.value })}
                                            disabled={disabled}
                                        />
                                    </label>
                                </fieldset>
                            </div>

                            <div className="flex items-center justify-between p-6 border-t border-base-300/40 bg-base-50/50">
                                <div className="text-sm text-base-content/60">Editing destination #{editingIndex + 1}</div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setEditingIndex(null); setEditDestination(null); }}
                                        className="btn "
                                        disabled={disabled}
                                    >
                                        Cancel
                                    </button>
                                    <HoverScale scale={1.02}>
                                        <button
                                            onClick={() => {
                                                if (!editDestination) return;
                                                if (editDestination.type === 'integration' && !editDestination.integrationId) {
                                                    toast.validation({ message: 'Please select an integration' });
                                                    return;
                                                }
                                                if (editDestination.type === 'email' && !editDestination.email) {
                                                    toast.validation({ message: 'Please enter an email address' });
                                                    return;
                                                }
                                                if (editDestination.type === 'webhook' && !editDestination.webhookUrl) {
                                                    toast.validation({ message: 'Please enter a webhook URL' });
                                                    return;
                                                }
                                                const updated = destinations.map((d, i) => i === editingIndex ? { ...editDestination } : d);
                                                onChange(updated);
                                                setEditingIndex(null);
                                                setEditDestination(null);
                                            }}
                                            className="btn btn-primary"
                                            disabled={disabled}
                                        >
                                            <i className="fa-duotone fa-solid fa-check mr-2" />
                                            Save Changes
                                        </button>
                                    </HoverScale>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
