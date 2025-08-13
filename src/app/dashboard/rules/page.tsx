"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from "@/components/tenant-context";
import RuleBuilder from "@/components/rule-builder";
import SiteSelector from "@/components/site-selector";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { RulePredicate } from "@/lib/rule-engine";
import { toastUtils } from '@/lib/toast';

type Destination = {
    type: 'integration' | 'email' | 'webhook';
    integrationId?: string;
    email?: string;
    webhookUrl?: string;
    template?: string;
    config?: Record<string, unknown>;
};

type TestDetail = {
    reason: string;
    result: boolean;
};

type EscalationRule = {
    id: string;
    name: string;
    description?: string;
    predicate: RulePredicate;
    destinations: Destination[];
    priority: number;
    enabled: boolean;
    rule_type: 'escalation' | 'routing' | 'notification';
    site_id?: string;
    site_name?: string;
    site_domain?: string;
    execution_count: number;
    last_execution?: string;
    created_at: string;
    updated_at: string;
};

export default function RulesPage() {
    const { tenantId } = useTenant();
    const [rules, setRules] = useState<EscalationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingRule, setEditingRule] = useState<EscalationRule | undefined>();
    const [testingRule, setTestingRule] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        siteId: '',
        enabled: 'true',
        type: ''
    });
    const [formData, setFormData] = useState<{
        name: string;
        description: string;
        predicate: RulePredicate;
        destinations: Destination[];
        priority: number;
        enabled: boolean;
        ruleType: 'escalation' | 'routing' | 'notification';
        siteId: string;
    }>({
        name: '',
        description: '',
        predicate: { operator: 'and', conditions: [] },
        destinations: [],
        priority: 0,
        enabled: true,
        ruleType: 'escalation',
        siteId: ''
    });

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Conversations", href: "/dashboard/conversations", icon: "fa-comments" },
        { label: "Escalation Rules", icon: "fa-route" }
    ];

    const loadRules = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filters.siteId) params.set('siteId', filters.siteId);
            if (filters.enabled !== '') params.set('enabled', filters.enabled);
            if (filters.type) params.set('type', filters.type);

            const response = await fetch(`/api/rules?${params}`, {
                headers: { 'x-tenant-id': tenantId }
            });
            if (response.ok) {
                const data = await response.json();
                setRules(data);
            }
        } catch (error) {
            console.error('Error loading rules:', error);
        } finally {
            setLoading(false);
        }
    }, [tenantId, filters]);

    useEffect(() => {
        if (tenantId) {
            loadRules();
        }
    }, [tenantId, filters, loadRules]);

    const handleSave = async () => {
        try {
            const url = editingRule ? `/api/rules/${editingRule.id}` : '/api/rules';
            const method = editingRule ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                siteId: formData.siteId || undefined
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setShowEditor(false);
                setEditingRule(undefined);
                resetForm();
                loadRules();
                toastUtils.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully');
            } else {
                const error = await response.json();
                toastUtils.apiError(error, 'Failed to save rule');
            }
        } catch (error) {
            console.error('Error saving rule:', error);
            toastUtils.error('Failed to save rule');
        }
    };

    const handleDelete = async (rule: EscalationRule) => {
        if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) return;

        try {
            const response = await fetch(`/api/rules/${rule.id}`, {
                method: 'DELETE',
                headers: { 'x-tenant-id': tenantId }
            });

            if (response.ok) {
                loadRules();
                toastUtils.success('Rule deleted successfully');
            } else {
                const error = await response.json();
                toastUtils.apiError(error, 'Failed to delete rule');
            }
        } catch (error) {
            console.error('Error deleting rule:', error);
            toastUtils.error('Failed to delete rule');
        }
    };

    const handleEdit = (rule: EscalationRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            description: rule.description || '',
            predicate: rule.predicate,
            destinations: rule.destinations,
            priority: rule.priority,
            enabled: rule.enabled,
            ruleType: rule.rule_type,
            siteId: rule.site_id || ''
        });
        setShowEditor(true);
    };

    const toggleRule = async (rule: EscalationRule) => {
        try {
            const response = await fetch(`/api/rules/${rule.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify({ enabled: !rule.enabled })
            });

            if (response.ok) {
                loadRules();
                toastUtils.success('Rule updated successfully');
            } else {
                const error = await response.json();
                toastUtils.apiError(error, 'Failed to update rule');
            }
        } catch (error) {
            console.error('Error updating rule:', error);
            toastUtils.error('Failed to update rule');
        }
    };

    const testRule = async (ruleId: string) => {
        setTestingRule(ruleId);
        try {
            const response = await fetch(`/api/rules/${ruleId}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify({
                    message: 'How do I reset my password?',
                    confidence: 0.3,
                    userEmail: 'user@example.com'
                })
            });

            if (response.ok) {
                const result = await response.json();
                const resultMessage = `Test result: ${result.matched ? 'MATCHED ✅' : 'NOT MATCHED ❌'}\n\nDetails:\n${result.details.map((d: TestDetail) => `- ${d.reason} (${d.result ? 'Pass' : 'Fail'})`).join('\n')}`;
                toastUtils.info(resultMessage);
            } else {
                const error = await response.json();
                toastUtils.apiError(error, 'Failed to test rule');
            }
        } catch (error) {
            console.error('Error testing rule:', error);
            toastUtils.error('Failed to test rule');
        } finally {
            setTestingRule(null);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            predicate: { operator: 'and', conditions: [] },
            destinations: [],
            priority: 0,
            enabled: true,
            ruleType: 'escalation',
            siteId: ''
        });
    };

    const getRuleTypeIcon = (type: string) => {
        switch (type) {
            case 'escalation': return 'fa-arrow-up text-error';
            case 'routing': return 'fa-route text-warning';
            case 'notification': return 'fa-bell text-info';
            default: return 'fa-cog text-base-content/60';
        }
    };

    const getPriorityColor = (priority: number) => {
        if (priority >= 80) return 'text-error';
        if (priority >= 40) return 'text-warning';
        return 'text-base-content/60';
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
                                <h1 className="text-3xl font-bold text-base-content">Escalation Rules</h1>
                                <p className="text-base-content/60 mt-2">
                                    Automate escalation and routing based on conversation context, confidence, and other conditions
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="stats shadow">
                                    <div className="stat">
                                        <div className="stat-figure text-primary">
                                            <i className="fa-duotone fa-solid fa-route text-2xl" aria-hidden />
                                        </div>
                                        <div className="stat-title">Total Rules</div>
                                        <div className="stat-value text-primary text-lg">{rules.length}</div>
                                        <div className="stat-desc">Active: {rules.filter(r => r.enabled).length}</div>
                                    </div>
                                </div>
                                <HoverScale scale={1.02}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            setEditingRule(undefined);
                                            resetForm();
                                            setShowEditor(true);
                                        }}
                                    >
                                        <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                        Create Rule
                                    </button>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Editor */}
                {showEditor && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-2xl shadow-sm">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-base-content">
                                            {editingRule ? 'Edit Rule' : 'Create New Rule'}
                                        </h3>
                                        <button
                                            className="btn btn-ghost btn-sm rounded-lg"
                                            onClick={() => {
                                                setShowEditor(false);
                                                setEditingRule(undefined);
                                            }}
                                        >
                                            <i className="fa-duotone fa-solid fa-times" aria-hidden />
                                        </button>
                                    </div>

                                    {/* Basic Information */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-4">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-semibold">Rule Name</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="input input-bordered"
                                                    placeholder="e.g., Low Confidence Escalation"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-semibold">Description</span>
                                                </label>
                                                <textarea
                                                    className="textarea textarea-bordered h-20"
                                                    placeholder="Optional description of what this rule does..."
                                                    value={formData.description}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-semibold">Priority</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    className="range range-primary"
                                                    value={formData.priority}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                                                />
                                                <div className="text-center text-sm text-base-content/60 mt-1">
                                                    {formData.priority} (Higher = evaluated first)
                                                </div>
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-semibold">Rule Type</span>
                                                </label>
                                                <select
                                                    className="select select-bordered"
                                                    value={formData.ruleType}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, ruleType: e.target.value as 'escalation' | 'routing' | 'notification' }))}
                                                >
                                                    <option value="escalation">Escalation</option>
                                                    <option value="routing">Routing</option>
                                                    <option value="notification">Notification</option>
                                                </select>
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-semibold">Associated Site</span>
                                                </label>
                                                <SiteSelector
                                                    tenantId={tenantId}
                                                    value={formData.siteId}
                                                    onChange={(siteId) => setFormData(prev => ({ ...prev, siteId: siteId || '' }))}
                                                    allowNone={true}
                                                    noneLabel="All sites"
                                                    placeholder="Select a site"
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="cursor-pointer label">
                                                    <span className="label-text font-semibold">Enabled</span>
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-primary"
                                                        checked={formData.enabled}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rule Builder */}
                                    <RuleBuilder
                                        tenantId={tenantId}
                                        predicate={formData.predicate}
                                        destinations={formData.destinations}
                                        onPredicateChange={(predicate) => setFormData(prev => ({ ...prev, predicate }))}
                                        onDestinationsChange={(destinations) => setFormData(prev => ({ ...prev, destinations }))}
                                    />

                                    {/* Save Actions */}
                                    <div className="flex gap-3 mt-6 pt-6 border-t border-base-300">
                                        <HoverScale scale={1.02}>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleSave}
                                                disabled={!formData.name.trim() || formData.predicate.conditions.length === 0 || formData.destinations.length === 0}
                                            >
                                                {editingRule ? 'Update Rule' : 'Create Rule'}
                                            </button>
                                        </HoverScale>
                                        <button
                                            className="btn btn-ghost"
                                            onClick={() => {
                                                setShowEditor(false);
                                                setEditingRule(undefined);
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Filters */}
                {!showEditor && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 border border-base-300">
                                <div className="card-body">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Filter by site</span>
                                            </label>
                                            <SiteSelector
                                                tenantId={tenantId}
                                                value={filters.siteId}
                                                onChange={(siteId) => setFilters(prev => ({ ...prev, siteId: siteId || '' }))}
                                                allowNone={true}
                                                noneLabel="All sites"
                                                placeholder="Select a site"
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Status</span>
                                            </label>
                                            <select
                                                className="select select-bordered"
                                                value={filters.enabled}
                                                onChange={(e) => setFilters(prev => ({ ...prev, enabled: e.target.value }))}
                                            >
                                                <option value="">All rules</option>
                                                <option value="true">Enabled only</option>
                                                <option value="false">Disabled only</option>
                                            </select>
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Type</span>
                                            </label>
                                            <select
                                                className="select select-bordered"
                                                value={filters.type}
                                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                            >
                                                <option value="">All types</option>
                                                <option value="escalation">Escalation</option>
                                                <option value="routing">Routing</option>
                                                <option value="notification">Notification</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Rules List */}
                {!showEditor && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 border border-base-300">
                                <div className="card-body p-0">
                                    {loading ? (
                                        <div className="p-8 space-y-4">
                                            {Array.from({ length: 3 }, (_, i) => (
                                                <div key={i} className="animate-pulse bg-base-300/60 h-20 rounded-xl"></div>
                                            ))}
                                        </div>
                                    ) : rules.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                <i className="fa-duotone fa-solid fa-route text-2xl text-base-content/40" aria-hidden />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">No rules found</h3>
                                            <p className="text-base-content/60 mb-4">
                                                {filters.siteId || filters.enabled !== 'true' || filters.type
                                                    ? 'Try adjusting your filters'
                                                    : 'Create your first escalation rule to automatically route conversations'
                                                }
                                            </p>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => {
                                                    setEditingRule(undefined);
                                                    resetForm();
                                                    setShowEditor(true);
                                                }}
                                            >
                                                <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                Create Rule
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-base-200">
                                            {rules.map((rule) => (
                                                <div key={rule.id} className="p-6 hover:bg-base-200/40 transition-colors">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${rule.enabled ? 'bg-success/20' : 'bg-base-300'}`}>
                                                                    <i className={`fa-duotone fa-solid ${getRuleTypeIcon(rule.rule_type)}`} aria-hidden />
                                                                </div>
                                                                <h3 className="font-semibold text-base-content line-clamp-1">
                                                                    {rule.name}
                                                                </h3>
                                                                <div className={`text-sm font-medium ${getPriorityColor(rule.priority)}`}>
                                                                    P{rule.priority}
                                                                </div>
                                                                <div className={`badge ${rule.enabled ? 'badge-success' : 'badge-error'} badge-sm`}>
                                                                    {rule.enabled ? 'Enabled' : 'Disabled'}
                                                                </div>
                                                            </div>

                                                            {rule.description && (
                                                                <p className="text-base-content/70 text-sm line-clamp-2 mb-3">
                                                                    {rule.description}
                                                                </p>
                                                            )}

                                                            <div className="flex items-center gap-4 text-xs text-base-content/60">
                                                                {rule.site_name && (
                                                                    <div className="flex items-center gap-1">
                                                                        <i className="fa-duotone fa-solid fa-globe" aria-hidden />
                                                                        <span>{rule.site_name}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-1">
                                                                    <i className="fa-duotone fa-solid fa-filter" aria-hidden />
                                                                    <span>{rule.predicate.conditions.length} condition{rule.predicate.conditions.length > 1 ? 's' : ''}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <i className="fa-duotone fa-solid fa-paper-plane" aria-hidden />
                                                                    <span>{rule.destinations.length} destination{rule.destinations.length > 1 ? 's' : ''}</span>
                                                                </div>
                                                                {rule.execution_count > 0 && (
                                                                    <div className="flex items-center gap-1">
                                                                        <i className="fa-duotone fa-solid fa-chart-line" aria-hidden />
                                                                        <span>{rule.execution_count} executions</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-1">
                                                                    <i className="fa-duotone fa-solid fa-calendar" aria-hidden />
                                                                    <span>Updated {new Date(rule.updated_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <HoverScale scale={1.05}>
                                                                <button
                                                                    className={`btn btn-sm btn-outline rounded-lg ${testingRule === rule.id ? 'loading' : ''}`}
                                                                    onClick={() => testRule(rule.id)}
                                                                    disabled={testingRule === rule.id}
                                                                    title="Test rule"
                                                                >
                                                                    <i className="fa-duotone fa-solid fa-flask" aria-hidden />
                                                                </button>
                                                            </HoverScale>

                                                            <HoverScale scale={1.05}>
                                                                <button
                                                                    className={`btn btn-sm ${rule.enabled ? 'btn-warning' : 'btn-success'} btn-outline rounded-lg`}
                                                                    onClick={() => toggleRule(rule)}
                                                                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                                                                >
                                                                    <i className={`fa-duotone fa-solid ${rule.enabled ? 'fa-pause' : 'fa-play'}`} aria-hidden />
                                                                </button>
                                                            </HoverScale>

                                                            <HoverScale scale={1.05}>
                                                                <button
                                                                    className="btn btn-sm btn-ghost rounded-lg"
                                                                    onClick={() => handleEdit(rule)}
                                                                    title="Edit rule"
                                                                >
                                                                    <i className="fa-duotone fa-solid fa-edit" aria-hidden />
                                                                </button>
                                                            </HoverScale>

                                                            <HoverScale scale={1.05}>
                                                                <button
                                                                    className="btn btn-sm btn-ghost text-error rounded-lg"
                                                                    onClick={() => handleDelete(rule)}
                                                                    title="Delete rule"
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
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Help Section */}
                {!showEditor && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 border border-base-300">
                                <div className="card-body">
                                    <h2 className="card-title">
                                        <i className="fa-duotone fa-solid fa-lightbulb mr-2 text-primary" aria-hidden />
                                        How Escalation Rules Work
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="fa-duotone fa-solid fa-filter text-primary" aria-hidden />
                                                <h3 className="font-semibold">Conditions</h3>
                                            </div>
                                            <p className="text-sm text-base-content/70">
                                                Set up conditions based on confidence score, keywords, time of day, user email domain, and more.
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="fa-duotone fa-solid fa-paper-plane text-primary" aria-hidden />
                                                <h3 className="font-semibold">Actions</h3>
                                            </div>
                                            <p className="text-sm text-base-content/70">
                                                Route to integrations like Slack or email, send webhooks, or trigger notifications when conditions are met.
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="fa-duotone fa-solid fa-chart-line text-primary" aria-hidden />
                                                <h3 className="font-semibold">Priority</h3>
                                            </div>
                                            <p className="text-sm text-base-content/70">
                                                Rules are evaluated in priority order (highest first), so important escalations happen before general routing.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}
            </div>
        </AnimatedPage>
    );
}
