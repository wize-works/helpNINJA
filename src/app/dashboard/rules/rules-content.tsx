"use client";

import { useState, useEffect } from 'react';
import { StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import RuleBuilder from "@/components/rule-builder";
import SiteSelector from "@/components/site-selector";
import { RuleConditions } from "@/lib/rule-engine";
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
    predicate?: RuleConditions; // Frontend might still be using predicate
    conditions?: RuleConditions; // Database uses conditions
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

interface Filters {
    search?: string;
    enabled?: string;
    type?: string;
    siteId?: string;
}

interface RulesContentProps {
    tenantId: string;
    filters: Filters;
}

export default function RulesContent({ tenantId, filters }: RulesContentProps) {
    const [rules, setRules] = useState<EscalationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingRule, setEditingRule] = useState<EscalationRule | undefined>();
    const [testingRule, setTestingRule] = useState<string | null>(null);
    const [currentRuleId, setCurrentRuleId] = useState<string>('');
    const [showTestInterface, setShowTestInterface] = useState(false);
    const [testData, setTestData] = useState({
        message: 'How do I reset my password?',
        confidence: 0.3,
        userEmail: 'user@example.com',
        offHours: false
    });
    const [testResult, setTestResult] = useState<{
        matched: boolean;
        details: TestDetail[];
    } | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        description: string;
        predicate: RuleConditions;
        conditions: RuleConditions;
        destinations: Destination[];
        priority: number;
        enabled: boolean;
        ruleType: 'escalation' | 'routing' | 'notification';
        siteId: string;
    }>({
        name: '',
        description: '',
        predicate: { operator: 'and', conditions: [] },
        conditions: { operator: 'and', conditions: [] },
        destinations: [],
        priority: 0,
        enabled: true,
        ruleType: 'escalation',
        siteId: ''
    });

    // Load rules based on filters
    useEffect(() => {
        loadRules();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const loadRules = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.search) params.set('search', filters.search);
            if (filters.siteId) params.set('siteId', filters.siteId);
            if (filters.enabled !== undefined && filters.enabled !== '') params.set('enabled', filters.enabled);
            if (filters.type) params.set('type', filters.type);

            const response = await fetch(`/api/rules?${params}`);
            if (response.ok) {
                const data = await response.json();
                setRules(data);
            }
        } catch (error) {
            console.error('Error loading rules:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const url = editingRule ? `/api/rules/${editingRule.id}` : '/api/rules';
            const method = editingRule ? 'PUT' : 'POST';

            // Copy predicate to conditions for API compatibility
            const payload = {
                ...formData,
                conditions: formData.predicate, // Ensure we're sending the conditions field that the API expects
                siteId: formData.siteId || undefined
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
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
        const ruleConditions = rule.predicate || rule.conditions || { operator: 'and', conditions: [] };
        setFormData({
            name: rule.name,
            description: rule.description || '',
            predicate: ruleConditions,
            conditions: ruleConditions,
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
                    'Content-Type': 'application/json'
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
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testData)
            });

            if (response.ok) {
                const result = await response.json();
                setTestResult(result);
                setShowTestInterface(true);
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

    const openTestInterface = (ruleId: string) => {
        setShowTestInterface(true);
        setCurrentRuleId(ruleId);
        setTestingRule(null);
        setTestResult(null);
    };

    const closeTestInterface = () => {
        setShowTestInterface(false);
        setTestResult(null);
        setTestingRule(null);
        setCurrentRuleId('');
    };

    const resetForm = () => {
        const emptyConditions: RuleConditions = { operator: 'and' as const, conditions: [] };
        setFormData({
            name: '',
            description: '',
            predicate: emptyConditions,
            conditions: emptyConditions,
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

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                <div className="p-8 space-y-4">
                    {Array.from({ length: 3 }, (_, i) => (
                        <div key={i} className="animate-pulse bg-base-300/60 h-20 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Create Rule Button */}
            {!showEditor && (
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex justify-end mb-4">
                            <HoverScale scale={1.02}>
                                <button
                                    className="btn btn-primary rounded-xl"
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
                    </StaggerChild>
                </StaggerContainer>
            )}

            {/* Editor */}
            {showEditor && (
                <StaggerContainer>
                    <StaggerChild>
                        <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                            <i className={`fa-duotone fa-solid ${editingRule ? 'fa-edit' : 'fa-plus'} text-lg text-primary`} aria-hidden />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-base-content">
                                                {editingRule ? 'Edit Rule' : 'Create New Rule'}
                                            </h3>
                                            <p className="text-base-content/60 text-sm">
                                                {editingRule ? 'Update your escalation rule configuration' : 'Create a new rule to automate conversation handling'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-ghost btn-sm btn-square rounded-lg"
                                        onClick={() => {
                                            setShowEditor(false);
                                            setEditingRule(undefined);
                                        }}
                                    >
                                        <i className="fa-duotone fa-solid fa-times" aria-hidden />
                                    </button>
                                </div>

                                {/* Basic Information */}
                                <fieldset className="space-y-6 mb-6">
                                    <legend className="text-base font-semibold text-base-content mb-4">Rule Information</legend>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <label className="block">
                                                <span className="text-sm font-medium text-base-content mb-2 block">
                                                    Rule Name
                                                    <span className="text-error ml-1">*</span>
                                                </span>
                                                <input
                                                    type="text"
                                                    className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                                    placeholder="e.g., Low Confidence Escalation"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                />
                                                <div className="text-xs text-base-content/60 mt-1">
                                                    Give your rule a descriptive name for easy identification
                                                </div>
                                            </label>

                                            <label className="block">
                                                <span className="text-sm font-medium text-base-content mb-2 block">Description</span>
                                                <textarea
                                                    className="textarea textarea-bordered w-full h-20 focus:textarea-primary transition-all duration-200 focus:scale-[1.02]"
                                                    placeholder="Optional description of what this rule does..."
                                                    value={formData.description}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                />
                                                <div className="text-xs text-base-content/60 mt-1">
                                                    Explain the purpose and behavior of this rule
                                                </div>
                                            </label>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="block">
                                                <span className="text-sm font-medium text-base-content mb-2 block">Priority</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    className="range range-primary w-full"
                                                    value={formData.priority}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                                                />
                                                <div className="w-full flex justify-between text-xs px-2 mt-1">
                                                    <span>Low (0)</span>
                                                    <span className="font-semibold text-primary">{formData.priority}</span>
                                                    <span>High (100)</span>
                                                </div>
                                                <div className="text-xs text-base-content/60 mt-1">
                                                    Higher priority rules are evaluated first
                                                </div>
                                            </label>

                                            <label className="block">
                                                <span className="text-sm font-medium text-base-content mb-2 block">Rule Type</span>
                                                <select
                                                    className="select select-bordered w-full focus:select-primary transition-all duration-200"
                                                    value={formData.ruleType}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, ruleType: e.target.value as 'escalation' | 'routing' | 'notification' }))}
                                                >
                                                    <option value="escalation">🚨 Escalation - Route to human support</option>
                                                    <option value="routing">🔄 Routing - Send to specific integrations</option>
                                                    <option value="notification">🔔 Notification - Alert team members</option>
                                                </select>
                                                <div className="text-xs text-base-content/60 mt-1">
                                                    Determines what action the rule will perform
                                                </div>
                                            </label>

                                            <label className="block">
                                                <span className="text-sm font-medium text-base-content mb-2 block">Associated Site</span>
                                                <SiteSelector
                                                    value={formData.siteId}
                                                    onChange={(siteId) => setFormData(prev => ({ ...prev, siteId: siteId || '' }))}
                                                    allowNone={true}
                                                    noneLabel="All sites"
                                                    placeholder="Select a site"
                                                />
                                                <div className="text-xs text-base-content/60 mt-1">
                                                    Optional: Apply rule only to specific sites
                                                </div>
                                            </label>

                                            <label className="block">
                                                <span className="text-sm font-medium text-base-content mb-2 block">Status</span>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <label className="cursor-pointer flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-primary"
                                                            checked={formData.enabled}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                                                        />
                                                        <span className="text-sm">Enabled</span>
                                                    </label>
                                                </div>
                                                <div className="text-xs text-base-content/60 mt-1">
                                                    Disabled rules won&apos;t execute even when conditions are met
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </fieldset>

                                {/* Rule Builder */}
                                <fieldset className="space-y-4 mb-6">
                                    <legend className="text-base font-semibold text-base-content mb-4">Rule Logic & Actions</legend>
                                    <RuleBuilder
                                        tenantId={tenantId}
                                        predicate={formData.predicate}
                                        destinations={formData.destinations}
                                        onPredicateChange={(predicate) => setFormData(prev => ({
                                            ...prev,
                                            predicate,
                                            conditions: predicate // Keep both predicate and conditions in sync
                                        }))}
                                        onDestinationsChange={(destinations) => setFormData(prev => ({ ...prev, destinations }))}
                                    />
                                </fieldset>

                                {/* Save Actions */}
                                <div className="flex items-center justify-between pt-4 border-t border-base-200/60">
                                    <div className="text-sm text-base-content/60">
                                        {editingRule ? 'Update your escalation rule configuration' : 'Create a new rule to automate conversation handling'}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            className="btn btn-ghost rounded-xl"
                                            onClick={() => {
                                                setShowEditor(false);
                                                setEditingRule(undefined);
                                            }}
                                        >
                                            Cancel
                                        </button>

                                        <HoverScale scale={1.02}>
                                            <button
                                                className={`btn btn-primary rounded-xl ${!formData.name.trim() || formData.predicate.conditions.length === 0 || formData.destinations.length === 0 ? 'btn-disabled' : ''}`}
                                                onClick={handleSave}
                                                disabled={!formData.name.trim() || formData.predicate.conditions.length === 0 || formData.destinations.length === 0}
                                            >
                                                {editingRule ? (
                                                    <>
                                                        <i className="fa-duotone fa-solid fa-save mr-2" aria-hidden />
                                                        Update Rule
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                        Create Rule
                                                    </>
                                                )}
                                            </button>
                                        </HoverScale>
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
                        <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                            <div className="p-0">
                                {rules.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                                            <i className="fa-duotone fa-solid fa-route text-2xl text-base-content/40" aria-hidden />
                                        </div>
                                        <h3 className="font-semibold text-lg mb-2">No rules found</h3>
                                        <p className="text-base-content/60 mb-4">
                                            {filters.search || filters.siteId || filters.enabled !== undefined || filters.type
                                                ? 'Try adjusting your filters'
                                                : 'Create your first escalation rule to automatically route conversations'
                                            }
                                        </p>
                                        <button
                                            className="btn btn-primary rounded-xl"
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
                                                                <span>{(rule.predicate?.conditions || rule.conditions?.conditions || []).length} condition{(rule.predicate?.conditions || rule.conditions?.conditions || []).length > 1 ? 's' : ''}</span>
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
                                                                className="btn btn-sm btn-outline rounded-lg"
                                                                onClick={() => openTestInterface(rule.id)}
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

            {/* Test Rule Interface */}
            {showTestInterface && (
                <StaggerContainer>
                    <StaggerChild>
                        <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-flask text-lg text-secondary" aria-hidden />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-base-content">Test Rule</h3>
                                            <p className="text-base-content/60 text-sm">Test your rule with sample conversation data</p>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-ghost btn-sm btn-square rounded-lg"
                                        onClick={closeTestInterface}
                                    >
                                        <i className="fa-duotone fa-solid fa-times" aria-hidden />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Test Input Form */}
                                    <fieldset className="space-y-6">
                                        <legend className="text-base font-semibold text-base-content mb-4">Test Data</legend>

                                        <label className="block">
                                            <span className="text-sm font-medium text-base-content mb-2 block">
                                                Test Message
                                                <span className="text-error ml-1">*</span>
                                            </span>
                                            <textarea
                                                className="textarea textarea-bordered w-full h-20 focus:textarea-primary transition-all duration-200 focus:scale-[1.02]"
                                                placeholder="Enter a sample user message to test..."
                                                value={testData.message}
                                                onChange={(e) => setTestData(prev => ({ ...prev, message: e.target.value }))}
                                            />
                                            <div className="text-xs text-base-content/60 mt-1">
                                                The message content that will be evaluated against your rule conditions
                                            </div>
                                        </label>

                                        <label className="block">
                                            <span className="text-sm font-medium text-base-content mb-2 block">
                                                Confidence Score
                                            </span>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                className="range range-secondary w-full"
                                                value={testData.confidence}
                                                onChange={(e) => setTestData(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))}
                                            />
                                            <div className="w-full flex justify-between text-xs px-2 mt-1">
                                                <span>Low (0.0)</span>
                                                <span className="font-semibold text-secondary">{testData.confidence}</span>
                                                <span>High (1.0)</span>
                                            </div>
                                            <div className="text-xs text-base-content/60 mt-1">
                                                AI confidence level for the response (0.0 = low, 1.0 = high)
                                            </div>
                                        </label>

                                        <label className="block">
                                            <span className="text-sm font-medium text-base-content mb-2 block">User Email</span>
                                            <input
                                                type="email"
                                                className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                                placeholder="user@example.com"
                                                value={testData.userEmail}
                                                onChange={(e) => setTestData(prev => ({ ...prev, userEmail: e.target.value }))}
                                            />
                                            <div className="text-xs text-base-content/60 mt-1">
                                                User email for domain-based condition testing
                                            </div>
                                        </label>

                                        <label className="block">
                                            <span className="text-sm font-medium text-base-content mb-2 block">Off Hours</span>
                                            <div className="flex items-center gap-3 mt-2">
                                                <label className="cursor-pointer flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-secondary"
                                                        checked={testData.offHours || false}
                                                        onChange={(e) => setTestData(prev => ({ ...prev, offHours: e.target.checked }))}
                                                    />
                                                    <span className="text-sm">Currently outside business hours</span>
                                                </label>
                                            </div>
                                            <div className="text-xs text-base-content/60 mt-1">
                                                Check if testing during non-business hours for time-based conditions
                                            </div>
                                        </label>

                                        <div className="pt-4">
                                            <HoverScale scale={1.02}>
                                                <button
                                                    className={`btn btn-secondary rounded-xl w-full ${testingRule ? 'loading' : ''}`}
                                                    onClick={() => testRule(currentRuleId)}
                                                    disabled={!currentRuleId || !testData.message.trim()}
                                                >
                                                    {testingRule ? (
                                                        <>
                                                            <i className="fa-duotone fa-solid fa-spinner fa-spin fa-sm mr-2" aria-hidden />
                                                            Testing Rule...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fa-duotone fa-solid fa-play mr-2" aria-hidden />
                                                            Run Test
                                                        </>
                                                    )}
                                                </button>
                                            </HoverScale>
                                        </div>
                                    </fieldset>

                                    {/* Test Results */}
                                    <div className="space-y-4">
                                        <h4 className="text-base font-semibold text-base-content">Test Results</h4>

                                        {!testResult ? (
                                            <div className="text-center py-12 bg-base-200/40 rounded-xl border border-base-300">
                                                <div className="w-16 h-16 bg-base-300/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                                                    <i className="fa-duotone fa-solid fa-flask text-xl text-base-content/40" aria-hidden />
                                                </div>
                                                <p className="text-base-content/60 text-sm">Run a test to see results</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* Overall Result */}
                                                <div className={`p-4 rounded-xl border-2 ${testResult.matched
                                                    ? 'border-success bg-success/10 text-success'
                                                    : 'border-error bg-error/10 text-error'
                                                    }`}>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fa-duotone fa-solid ${testResult.matched ? 'fa-check-circle' : 'fa-times-circle'
                                                            } text-lg`} aria-hidden />
                                                        <span className="font-semibold">
                                                            {testResult.matched ? 'Rule MATCHED ✅' : 'Rule NOT MATCHED ❌'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Condition Details */}
                                                <div className="space-y-3">
                                                    <h5 className="text-sm font-medium text-base-content">Condition Results</h5>
                                                    {testResult.details.map((detail: TestDetail, index: number) => (
                                                        <div key={index} className={`p-3 rounded-lg border ${detail.result === true
                                                            ? 'border-success/30 bg-success/5'
                                                            : 'border-error/30 bg-error/5'
                                                            }`}>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm text-base-content">
                                                                    {detail.reason}
                                                                </span>
                                                                <div className={`badge badge-sm ${detail.result === true ? 'badge-success' : 'badge-error'
                                                                    }`}>
                                                                    {detail.result === true ? 'Pass' : 'Fail'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            )}
        </>
    );
}
