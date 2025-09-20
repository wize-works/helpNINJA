'use client';

import { useState, useEffect } from 'react';
import { HoverScale } from '@/components/ui/animated-page';
import Link from 'next/link';

interface IntegrationOption {
    id: string;
    provider: string;
    name: string;
    status: 'active' | 'disabled' | 'error';
}

interface EscalationChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEscalate: (selectedIntegrations: string[], reason: string, message?: string) => Promise<void>;
    sessionId?: string;
    userMessage?: string;
}

export default function EscalationChoiceModal({
    isOpen,
    onClose,
    onEscalate,
    sessionId,
    userMessage
}: EscalationChoiceModalProps) {
    const [integrations, setIntegrations] = useState<IntegrationOption[]>([]);
    const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
    const [reason, setReason] = useState<string>('manual');
    const [customMessage, setCustomMessage] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [loadingIntegrations, setLoadingIntegrations] = useState(true);

    // Load available integrations
    useEffect(() => {
        if (isOpen) {
            loadIntegrations();
        }
    }, [isOpen]);

    const loadIntegrations = async () => {
        setLoadingIntegrations(true);
        try {
            const response = await fetch('/api/integrations');
            if (response.ok) {
                const data = await response.json();
                const activeIntegrations = data.filter((i: IntegrationOption) => i.status === 'active');
                setIntegrations(activeIntegrations);

                // Pre-select all active integrations by default
                setSelectedIntegrations(activeIntegrations.map((i: IntegrationOption) => i.id));
            } else {
                console.error('Failed to load integrations');
            }
        } catch (error) {
            console.error('Error loading integrations:', error);
        } finally {
            setLoadingIntegrations(false);
        }
    };

    const handleIntegrationToggle = (integrationId: string) => {
        setSelectedIntegrations(prev =>
            prev.includes(integrationId)
                ? prev.filter(id => id !== integrationId)
                : [...prev, integrationId]
        );
    };

    const handleSelectAll = () => {
        if (selectedIntegrations.length === integrations.length) {
            setSelectedIntegrations([]);
        } else {
            setSelectedIntegrations(integrations.map(i => i.id));
        }
    };

    const handleEscalate = async () => {
        if (selectedIntegrations.length === 0) {
            return;
        }

        setLoading(true);
        try {
            await onEscalate(selectedIntegrations, reason, customMessage || undefined);
            onClose();
        } catch (error) {
            console.error('Escalation error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getProviderIcon = (provider: string) => {
        const icons: Record<string, string> = {
            slack: 'fa-slack',
            email: 'fa-envelope',
            teams: 'fa-microsoft',
            discord: 'fa-discord',
            linear: 'fa-linear',
            zendesk: 'fa-ticket-alt',
            servicenow: 'fa-cogs',
            freshdesk: 'fa-headset',
            jira: 'fa-jira'
        };
        return icons[provider] || 'fa-plug';
    };

    const getProviderColor = (provider: string) => {
        const colors: Record<string, string> = {
            slack: 'text-purple-500 bg-purple-500/10',
            email: 'text-blue-500 bg-blue-500/10',
            teams: 'text-blue-600 bg-blue-600/10',
            discord: 'text-indigo-500 bg-indigo-500/10',
            linear: 'text-gray-700 bg-gray-700/10',
            zendesk: 'text-green-600 bg-green-600/10',
            servicenow: 'text-teal-600 bg-teal-600/10',
            freshdesk: 'text-orange-500 bg-orange-500/10',
            jira: 'text-blue-700 bg-blue-700/10'
        };
        return colors[provider] || 'text-primary bg-primary/10';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300/40">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-base-300/40">
                        <div>
                            <h2 className="text-xl font-semibold text-base-content">
                                Choose Escalation Method
                            </h2>
                            <p className="text-sm text-base-content/60 mt-1">
                                Select which integrations should receive this escalation
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="btn  btn-circle btn-sm"
                            disabled={loading}
                        >
                            <i className="fa-duotone fa-solid fa-xmark text-lg" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Escalation Reason */}
                        <div>
                            <label className="label">
                                <span className="label-text font-medium">Escalation Reason</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={loading}
                            >
                                <option value="manual">Manual Review Requested</option>
                                <option value="complex_issue">Complex Issue</option>
                                <option value="customer_request">Customer Requested Human</option>
                                <option value="urgent">Urgent Issue</option>
                                <option value="billing">Billing Related</option>
                                <option value="technical">Technical Support</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Custom Message */}
                        <div>
                            <label className="label">
                                <span className="label-text font-medium">Additional Context (Optional)</span>
                            </label>
                            <textarea
                                className="textarea textarea-bordered w-full"
                                placeholder="Add any additional context for the support team..."
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        {/* Integration Selection */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="label-text font-medium">
                                    Select Integrations ({selectedIntegrations.length} of {integrations.length})
                                </label>
                                <button
                                    onClick={handleSelectAll}
                                    className="btn  btn-xs"
                                    disabled={loading || loadingIntegrations}
                                >
                                    {selectedIntegrations.length === integrations.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            {loadingIntegrations ? (
                                <div className="flex items-center justify-center p-8">
                                    <div className="loading loading-spinner loading-md"></div>
                                    <span className="ml-3 text-base-content/60">Loading integrations...</span>
                                </div>
                            ) : integrations.length === 0 ? (
                                <div className="text-center p-8">
                                    <div className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                                        <i className="fa-duotone fa-solid fa-triangle-exclamation text-xl text-warning" />
                                    </div>
                                    <h3 className="font-medium text-base-content mb-1">No Active Integrations</h3>
                                    <p className="text-sm text-base-content/60 mb-4">
                                        You need to set up integrations before escalating conversations.
                                    </p>
                                    <Link href="/dashboard/integrations/marketplace" className="btn btn-primary btn-sm">
                                        <i className="fa-duotone fa-solid fa-plus mr-2" />
                                        Add Integration
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto border border-base-300/40 rounded-lg p-3">
                                    {integrations.map((integration) => (
                                        <label
                                            key={integration.id}
                                            className="flex items-center p-3 rounded-lg border border-base-300/40 hover:bg-base-200/60 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-primary mr-3"
                                                checked={selectedIntegrations.includes(integration.id)}
                                                onChange={() => handleIntegrationToggle(integration.id)}
                                                disabled={loading}
                                            />
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getProviderColor(integration.provider)}`}>
                                                    <i className={`fa-duotone fa-solid ${getProviderIcon(integration.provider)} text-sm`} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">{integration.name}</div>
                                                    <div className="text-xs text-base-content/60 capitalize">{integration.provider}</div>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Conversation Context */}
                        {userMessage && (
                            <div className="bg-base-200/40 rounded-lg p-4">
                                <div className="text-sm font-medium text-base-content/80 mb-2">
                                    Latest User Message:
                                </div>
                                <div className="text-sm text-base-content/70 italic">
                                    &ldquo;{userMessage.length > 200 ? userMessage.substring(0, 200) + '...' : userMessage}&rdquo;
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-base-300/40 bg-base-50/50">
                        <div className="text-sm text-base-content/60">
                            {sessionId && (
                                <>Session: {sessionId.slice(0, 12)}...</>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="btn "
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <HoverScale scale={1.02}>
                                <button
                                    onClick={handleEscalate}
                                    className="btn btn-primary"
                                    disabled={loading || selectedIntegrations.length === 0 || loadingIntegrations}
                                >
                                    {loading ? (
                                        <>
                                            <span className="loading loading-spinner loading-xs mr-2" />
                                            Escalating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-duotone fa-solid fa-fire mr-2" />
                                            Escalate to {selectedIntegrations.length} Integration{selectedIntegrations.length !== 1 ? 's' : ''}
                                        </>
                                    )}
                                </button>
                            </HoverScale>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
