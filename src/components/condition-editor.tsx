"use client";

import { useState, useEffect } from 'react';
import { RuleCondition } from '@/lib/rule-engine';
import SiteSelector from './site-selector';

type ConditionType = {
    type: string;
    label: string;
    description: string;
    operators: string[];
    valueType: string;
};

interface ConditionEditorProps {
    condition: RuleCondition;
    availableTypes: ConditionType[];
    tenantId: string;
    onChange: (condition: RuleCondition) => void;
    onRemove: () => void;
    disabled?: boolean;
}

export default function ConditionEditor({
    condition,
    availableTypes,
    onChange,
    onRemove,
    disabled = false
}: ConditionEditorProps) {
    const [selectedType, setSelectedType] = useState<ConditionType | undefined>(
        availableTypes.find(t => t.type === condition.type)
    );

    useEffect(() => {
        setSelectedType(availableTypes.find(t => t.type === condition.type));
    }, [condition.type, availableTypes]);

    const handleTypeChange = (newType: string) => {
        const typeConfig = availableTypes.find(t => t.type === newType);
        if (!typeConfig) return;

        setSelectedType(typeConfig);

        // Reset to default values for the new type
        let defaultValue: unknown = '';
        const defaultOperator = typeConfig.operators[0];

        if (typeConfig.valueType === 'number') {
            defaultValue = newType === 'confidence' ? 0.5 : 1;
        } else if (newType === 'time' && typeConfig.operators.includes('eq')) {
            defaultValue = 'business_hours';
        }

        onChange({
            ...condition,
            type: newType as RuleCondition['type'],
            operator: defaultOperator as RuleCondition['operator'],
            value: defaultValue
        });
    };

    const handleOperatorChange = (newOperator: string) => {
        onChange({
            ...condition,
            operator: newOperator as RuleCondition['operator']
        });
    };

    const handleValueChange = (newValue: unknown) => {
        onChange({
            ...condition,
            value: newValue
        });
    };

    const getOperatorLabel = (op: string) => {
        const labels: Record<string, string> = {
            'lt': 'less than',
            'lte': 'less than or equal',
            'gt': 'greater than',
            'gte': 'greater than or equal',
            'eq': 'equals',
            'ne': 'not equals',
            'contains': 'contains',
            'not_contains': 'does not contain',
            'in': 'is one of',
            'not_in': 'is not one of',
            'between': 'between'
        };
        return labels[op] || op;
    };

    const renderValueInput = () => {
        if (!selectedType) return null;

        const { type, valueType } = selectedType;
        const { operator, value } = condition;

        if (type === 'site') {
            if (operator === 'in') {
                // Multiple site selection - for now, simplified to single site
                return (
                    <SiteSelector
                        value={Array.isArray(value) ? value[0] : String(value || '')}
                        onChange={(siteId) => handleValueChange([siteId])}
                        allowNone={false}
                        placeholder="Select a site"
                        disabled={disabled}
                    />
                );
            } else {
                return (
                    <SiteSelector
                        value={String(value || '')}
                        onChange={(siteId) => handleValueChange(siteId)}
                        allowNone={false}
                        placeholder="Select a site"
                        disabled={disabled}
                    />
                );
            }
        }

        if (type === 'time' && operator === 'eq') {
            return (
                <select
                    className="select select-bordered"
                    value={String(value)}
                    onChange={(e) => handleValueChange(e.target.value)}
                    disabled={disabled}
                >
                    <option value="business_hours">Business Hours (9 AM - 5 PM)</option>
                    <option value="off_hours">Off Hours (5 PM - 9 AM)</option>
                </select>
            );
        }

        if (type === 'time' && operator === 'between') {
            const timeValue = Array.isArray(value) ? value : [9, 17];
            return (
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        max="23"
                        className="input input-bordered w-20"
                        value={timeValue[0]}
                        onChange={(e) => handleValueChange([parseInt(e.target.value), timeValue[1]])}
                        disabled={disabled}
                    />
                    <span className="text-sm text-base-content/60">to</span>
                    <input
                        type="number"
                        min="0"
                        max="23"
                        className="input input-bordered w-20"
                        value={timeValue[1]}
                        onChange={(e) => handleValueChange([timeValue[0], parseInt(e.target.value)])}
                        disabled={disabled}
                    />
                    <span className="text-xs text-base-content/60">(24-hour format)</span>
                </div>
            );
        }

        if (valueType === 'number') {
            const numValue = typeof value === 'number' ? value : 0;
            const step = type === 'confidence' ? 0.1 : 1;
            const min = type === 'confidence' ? 0 : undefined;
            const max = type === 'confidence' ? 1 : undefined;

            return (
                <input
                    type="number"
                    step={step}
                    min={min}
                    max={max}
                    className="input input-bordered"
                    value={numValue}
                    onChange={(e) => handleValueChange(parseFloat(e.target.value))}
                    disabled={disabled}
                />
            );
        }

        if (operator === 'in' || operator === 'not_in') {
            const arrayValue = Array.isArray(value) ? value : [value].filter(Boolean);
            return (
                <div className="space-y-2">
                    <input
                        type="text"
                        className="input input-bordered"
                        placeholder="Enter values separated by commas"
                        value={arrayValue.join(', ')}
                        onChange={(e) => {
                            const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                            handleValueChange(values);
                        }}
                        disabled={disabled}
                    />
                    <div className="text-xs text-base-content/60">
                        Separate multiple values with commas
                    </div>
                </div>
            );
        }

        // Default text input
        return (
            <input
                type="text"
                className="input input-bordered"
                value={String(value || '')}
                onChange={(e) => handleValueChange(e.target.value)}
                disabled={disabled}
                placeholder="Enter value..."
            />
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
            {/* Condition Type */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text font-medium">When</span>
                </label>
                <select
                    className="select select-bordered"
                    value={condition.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    disabled={disabled}
                >
                    {availableTypes.map((type) => (
                        <option key={type.type} value={type.type}>
                            {type.label}
                        </option>
                    ))}
                </select>
                {selectedType && (
                    <label className="label">
                        <span className="label-text-alt">{selectedType.description}</span>
                    </label>
                )}
            </div>

            {/* Operator */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text font-medium">Is</span>
                </label>
                <select
                    className="select select-bordered"
                    value={condition.operator}
                    onChange={(e) => handleOperatorChange(e.target.value)}
                    disabled={disabled}
                >
                    {selectedType?.operators.map((op) => (
                        <option key={op} value={op}>
                            {getOperatorLabel(op)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Value */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text font-medium">Value</span>
                </label>
                {renderValueInput()}
            </div>

            {/* Remove Button */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text opacity-0">Remove</span>
                </label>
                <button
                    type="button"
                    className="btn btn-error btn-outline btn-sm rounded-lg"
                    onClick={onRemove}
                    disabled={disabled}
                    title="Remove condition"
                >
                    <i className="fa-duotone fa-solid fa-trash" aria-hidden />
                </button>
            </div>
        </div>
    );
}
