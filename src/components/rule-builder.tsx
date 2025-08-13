"use client";

import { useState } from 'react';
import { RuleCondition, RulePredicate, getAvailableConditionTypes } from '@/lib/rule-engine';
import ConditionEditor from './condition-editor';
import ActionSelector from './action-selector';
import { HoverScale } from './ui/animated-page';

type Destination = {
    type: 'integration' | 'email' | 'webhook';
    integrationId?: string;
    email?: string;
    webhookUrl?: string;
    template?: string;
    config?: Record<string, unknown>;
};

interface RuleBuilderProps {
    tenantId: string;
    predicate?: RulePredicate;
    destinations?: Destination[];
    onPredicateChange: (predicate: RulePredicate) => void;
    onDestinationsChange: (destinations: Destination[]) => void;
    disabled?: boolean;
}

export default function RuleBuilder({
    tenantId,
    predicate,
    destinations = [],
    onPredicateChange,
    onDestinationsChange,
    disabled = false
}: RuleBuilderProps) {
    const [testMode, setTestMode] = useState(false);
    const [testContext, setTestContext] = useState({
        message: 'How do I reset my password?',
        confidence: 0.3,
        userEmail: 'user@example.com',
        isOffHours: false
    });

    const availableConditions = getAvailableConditionTypes();

    // Initialize predicate if not provided
    const currentPredicate = predicate || {
        operator: 'and' as const,
        conditions: []
    };

    const addCondition = () => {
        const newCondition: RuleCondition = {
            type: 'confidence',
            operator: 'lt',
            value: 0.5
        };

        const updatedPredicate = {
            ...currentPredicate,
            conditions: [...currentPredicate.conditions, newCondition]
        };
        onPredicateChange(updatedPredicate);
    };

    const updateCondition = (index: number, condition: RuleCondition) => {
        const updatedConditions = [...currentPredicate.conditions];
        updatedConditions[index] = condition;
        onPredicateChange({
            ...currentPredicate,
            conditions: updatedConditions
        });
    };

    const removeCondition = (index: number) => {
        const updatedConditions = currentPredicate.conditions.filter((_, i) => i !== index);
        onPredicateChange({
            ...currentPredicate,
            conditions: updatedConditions
        });
    };

    const toggleOperator = () => {
        onPredicateChange({
            ...currentPredicate,
            operator: currentPredicate.operator === 'and' ? 'or' : 'and'
        });
    };

    return (
        <div className="space-y-6">
            {/* Conditions Section */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="card-title">
                            <i className="fa-duotone fa-solid fa-filter mr-2 text-primary" aria-hidden />
                            Conditions
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-base-content/70">
                                Trigger when{' '}
                                <button
                                    type="button"
                                    className={`btn btn-xs ${currentPredicate.operator === 'and' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={toggleOperator}
                                    disabled={disabled}
                                >
                                    {currentPredicate.operator.toUpperCase()}
                                </button>
                                {' '}conditions are met
                            </div>
                            <HoverScale scale={1.02}>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline"
                                    onClick={addCondition}
                                    disabled={disabled}
                                >
                                    <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                    Add Condition
                                </button>
                            </HoverScale>
                        </div>
                    </div>

                    {currentPredicate.conditions.length === 0 ? (
                        <div className="text-center py-8 text-base-content/50">
                            <i className="fa-duotone fa-solid fa-filter text-3xl mb-3 block" aria-hidden />
                            <p className="mb-4">No conditions defined</p>
                            <p className="text-sm">Add conditions to specify when this rule should trigger</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {currentPredicate.conditions.map((condition, index) => (
                                <div key={index} className="relative">
                                    {index > 0 && (
                                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
                                            <div className={`badge ${currentPredicate.operator === 'and' ? 'badge-primary' : 'badge-secondary'} badge-sm`}>
                                                {currentPredicate.operator.toUpperCase()}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="bg-base-200/40 border border-base-300 rounded-xl p-4">
                                        <ConditionEditor
                                            condition={condition as RuleCondition}
                                            availableTypes={availableConditions}
                                            tenantId={tenantId}
                                            onChange={(updatedCondition) => updateCondition(index, updatedCondition)}
                                            onRemove={() => removeCondition(index)}
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Section */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <h3 className="card-title">
                        <i className="fa-duotone fa-solid fa-paper-plane mr-2 text-secondary" aria-hidden />
                        Actions
                    </h3>
                    <p className="text-sm text-base-content/60 mb-4">
                        Define what happens when the conditions are met
                    </p>
                    
                    <ActionSelector
                        tenantId={tenantId}
                        destinations={destinations}
                        onChange={onDestinationsChange}
                        disabled={disabled}
                    />
                </div>
            </div>

            {/* Test Section */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="card-title">
                            <i className="fa-duotone fa-solid fa-flask mr-2 text-accent" aria-hidden />
                            Test Rule
                        </h3>
                        <button
                            type="button"
                            className={`btn btn-sm ${testMode ? 'btn-accent' : 'btn-outline'}`}
                            onClick={() => setTestMode(!testMode)}
                            disabled={disabled}
                        >
                            {testMode ? 'Hide Test' : 'Test Rule'}
                        </button>
                    </div>

                    {testMode && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Test Message</span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered h-20"
                                        placeholder="Enter a test message..."
                                        value={testContext.message}
                                        onChange={(e) => setTestContext(prev => ({ ...prev, message: e.target.value }))}
                                        disabled={disabled}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text">Confidence Score</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            className="range range-primary"
                                            value={testContext.confidence}
                                            onChange={(e) => setTestContext(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))}
                                            disabled={disabled}
                                        />
                                        <div className="text-center text-sm text-base-content/60 mt-1">
                                            {testContext.confidence}
                                        </div>
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text">User Email</span>
                                        </label>
                                        <input
                                            type="email"
                                            className="input input-bordered input-sm"
                                            value={testContext.userEmail}
                                            onChange={(e) => setTestContext(prev => ({ ...prev, userEmail: e.target.value }))}
                                            disabled={disabled}
                                        />
                                    </div>

                                    <div className="form-control">
                                        <label className="cursor-pointer label">
                                            <span className="label-text">Off Hours</span>
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-primary"
                                                checked={testContext.isOffHours}
                                                onChange={(e) => setTestContext(prev => ({ ...prev, isOffHours: e.target.checked }))}
                                                disabled={disabled}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    className="btn btn-accent"
                                    disabled={disabled || currentPredicate.conditions.length === 0}
                                >
                                    <i className="fa-duotone fa-solid fa-play mr-2" aria-hidden />
                                    Run Test
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Rule Summary */}
            <div className="card bg-base-200/40 border border-base-300">
                <div className="card-body">
                    <h3 className="card-title text-sm">
                        <i className="fa-duotone fa-solid fa-summary mr-2 text-info" aria-hidden />
                        Rule Summary
                    </h3>
                    <div className="text-sm text-base-content/70">
                        {currentPredicate.conditions.length === 0 ? (
                            <span className="italic">No conditions defined</span>
                        ) : (
                            <>
                                Trigger when <strong>{currentPredicate.operator.toUpperCase()}</strong> of these{' '}
                                <strong>{currentPredicate.conditions.length}</strong> condition{currentPredicate.conditions.length > 1 ? 's' : ''} {currentPredicate.conditions.length > 1 ? 'are' : 'is'} met
                                {destinations.length > 0 && (
                                    <>, then send to <strong>{destinations.length}</strong> destination{destinations.length > 1 ? 's' : ''}</>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
