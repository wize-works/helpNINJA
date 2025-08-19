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
    predicate?: RulePredicate;
    destinations?: Destination[];
    onPredicateChange: (predicate: RulePredicate) => void;
    onDestinationsChange: (destinations: Destination[]) => void;
    disabled?: boolean;
}

export default function RuleBuilder({
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
            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                <i className="fa-duotone fa-solid fa-filter text-primary" aria-hidden />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-base-content">Conditions</h3>
                                <p className="text-base-content/60 text-sm">Define when this rule should trigger</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-base-content/70">
                                Trigger when{' '}
                                <button
                                    type="button"
                                    className={`btn btn-xs rounded-lg ${currentPredicate.operator === 'and' ? 'btn-primary' : 'btn-outline'}`}
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
                                    className="btn btn-sm btn-outline rounded-lg"
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
            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-paper-plane text-secondary" aria-hidden />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-base-content">Actions</h3>
                            <p className="text-base-content/60 text-sm">Define what happens when the conditions are met</p>
                        </div>
                    </div>

                    <ActionSelector
                        destinations={destinations}
                        onChange={onDestinationsChange}
                        disabled={disabled}
                    />
                </div>
            </div>

            {/* Test Section */}
            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                                <i className="fa-duotone fa-solid fa-flask text-accent" aria-hidden />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-base-content">Test Rule</h3>
                                <p className="text-base-content/60 text-sm">Test your rule logic with sample data</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className={`btn btn-sm rounded-lg ${testMode ? 'btn-accent' : 'btn-outline'}`}
                            onClick={() => setTestMode(!testMode)}
                            disabled={disabled}
                        >
                            {testMode ? 'Hide Test' : 'Test Rule'}
                        </button>
                    </div>

                    {testMode && (
                        <fieldset className="space-y-6">
                            <legend className="text-base font-semibold text-base-content mb-4">Test Data</legend>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">
                                        Test Message
                                        <span className="text-error ml-1">*</span>
                                    </span>
                                    <textarea
                                        className="textarea textarea-bordered w-full h-20 focus:textarea-primary transition-all duration-200 focus:scale-[1.02]"
                                        placeholder="Enter a test message..."
                                        value={testContext.message}
                                        onChange={(e) => setTestContext(prev => ({ ...prev, message: e.target.value }))}
                                        disabled={disabled}
                                    />
                                    <div className="text-xs text-base-content/60 mt-1">
                                        The message content that will be evaluated against your rule conditions
                                    </div>
                                </label>

                                <div className="space-y-3">
                                    <label className="block">
                                        <span className="text-sm font-medium text-base-content mb-2 block">
                                            Confidence Score
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            className="range range-accent w-full"
                                            value={testContext.confidence}
                                            onChange={(e) => setTestContext(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))}
                                            disabled={disabled}
                                        />
                                        <div className="w-full flex justify-between text-xs px-2 mt-1">
                                            <span>Low (0.0)</span>
                                            <span className="font-semibold text-accent">{testContext.confidence}</span>
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
                                            value={testContext.userEmail}
                                            onChange={(e) => setTestContext(prev => ({ ...prev, userEmail: e.target.value }))}
                                            disabled={disabled}
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
                                                    className="checkbox checkbox-accent"
                                                    checked={testContext.isOffHours}
                                                    onChange={(e) => setTestContext(prev => ({ ...prev, isOffHours: e.target.checked }))}
                                                    disabled={disabled}
                                                />
                                                <span className="text-sm">Currently outside business hours</span>
                                            </label>
                                        </div>
                                        <div className="text-xs text-base-content/60 mt-1">
                                            Check if testing during non-business hours for time-based conditions
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="button"
                                    className="btn btn-accent rounded-lg w-full"
                                    disabled={disabled || currentPredicate.conditions.length === 0}
                                >
                                    <i className="fa-duotone fa-solid fa-play mr-2" aria-hidden />
                                    Run Test
                                </button>
                            </div>
                        </fieldset>
                    )}
                </div>
            </div>

            {/* Rule Summary */}
            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-summary text-info" aria-hidden />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-base-content">Rule Summary</h3>
                            <p className="text-base-content/60 text-sm">Overview of your rule configuration</p>
                        </div>
                    </div>

                    <div className="text-sm text-base-content/70">
                        {currentPredicate.conditions.length === 0 ? (
                            <div className="text-center py-6 bg-base-200/40 rounded-xl border border-base-300">
                                <div className="w-12 h-12 bg-base-300/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <i className="fa-duotone fa-solid fa-filter text-xl text-base-content/40" aria-hidden />
                                </div>
                                <p className="text-base-content/60 text-sm">No conditions defined</p>
                            </div>
                        ) : (
                            <div className="p-4 bg-base-200/40 rounded-xl border border-base-300">
                                <p className="text-base-content/70">
                                    Trigger when <strong>{currentPredicate.operator.toUpperCase()}</strong> of these{' '}
                                    <strong>{currentPredicate.conditions.length}</strong> condition{currentPredicate.conditions.length > 1 ? 's' : ''} {currentPredicate.conditions.length > 1 ? 'are' : 'is'} met
                                    {destinations.length > 0 && (
                                        <>, then send to <strong>{destinations.length}</strong> destination{destinations.length > 1 ? 's' : ''}</>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
