/**
 * Rule Engine for evaluating escalation conditions
 * Supports complex logical conditions with AND/OR operators
 */

export type RuleCondition = {
    type: 'confidence' | 'keyword' | 'email_domain' | 'time' | 'session_duration' | 'conversation_length' | 'site';
    operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'between';
    value: unknown;
    field?: string; // For custom field conditions
};

export type RulePredicate = {
    operator: 'and' | 'or';
    conditions: (RuleCondition | RulePredicate)[];
};

export type EvaluationContext = {
    message: string;
    confidence: number;
    keywords: string[];
    userEmail?: string;
    timestamp: Date;
    siteId?: string;
    sessionDuration?: number; // in seconds
    isOffHours?: boolean;
    conversationLength?: number;
    customFields?: Record<string, unknown>;
};

export type EvaluationResult = {
    matched: boolean;
    details: Array<{
        condition: RuleCondition | RulePredicate;
        result: boolean;
        reason: string;
    }>;
};

/**
 * Evaluate a single condition against the context
 */
function evaluateCondition(condition: RuleCondition, context: EvaluationContext): { result: boolean; reason: string } {
    const { type, operator, value } = condition;
    
    try {
        switch (type) {
            case 'confidence':
                const confidence = context.confidence;
                return evaluateNumericCondition(confidence, operator, value as number, 'confidence');
                
            case 'keyword':
                const keywords = context.keywords || [];
                const message = context.message.toLowerCase();
                const keywordValue = String(value).toLowerCase();
                
                switch (operator) {
                    case 'contains':
                        const found = keywords.some(k => k.includes(keywordValue)) || message.includes(keywordValue);
                        return { result: found, reason: `Message ${found ? 'contains' : 'does not contain'} keyword "${keywordValue}"` };
                    case 'not_contains':
                        const notFound = !keywords.some(k => k.includes(keywordValue)) && !message.includes(keywordValue);
                        return { result: notFound, reason: `Message ${notFound ? 'does not contain' : 'contains'} keyword "${keywordValue}"` };
                    case 'in':
                        const valueArray = Array.isArray(value) ? value : [value];
                        const hasAny = valueArray.some(v => keywords.includes(String(v).toLowerCase()) || message.includes(String(v).toLowerCase()));
                        return { result: hasAny, reason: `Message ${hasAny ? 'contains' : 'does not contain'} any of: ${valueArray.join(', ')}` };
                    default:
                        return { result: false, reason: `Unsupported keyword operator: ${operator}` };
                }
                
            case 'email_domain':
                const email = context.userEmail || '';
                const emailDomain = email.split('@')[1] || '';
                const targetDomain = String(value).toLowerCase();
                
                switch (operator) {
                    case 'eq':
                        const matches = emailDomain.toLowerCase() === targetDomain;
                        return { result: matches, reason: `Email domain ${matches ? 'matches' : 'does not match'} "${targetDomain}"` };
                    case 'contains':
                        const contains = emailDomain.toLowerCase().includes(targetDomain);
                        return { result: contains, reason: `Email domain ${contains ? 'contains' : 'does not contain'} "${targetDomain}"` };
                    case 'in':
                        const domains = Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : [targetDomain];
                        const inList = domains.includes(emailDomain.toLowerCase());
                        return { result: inList, reason: `Email domain ${inList ? 'is' : 'is not'} in: ${domains.join(', ')}` };
                    default:
                        return { result: false, reason: `Unsupported email domain operator: ${operator}` };
                }
                
            case 'time':
                const currentHour = context.timestamp.getHours();
                const isOffHours = context.isOffHours ?? (currentHour < 9 || currentHour >= 17); // Default business hours: 9-17
                
                switch (operator) {
                    case 'eq':
                        if (value === 'business_hours') {
                            return { result: !isOffHours, reason: `Current time ${!isOffHours ? 'is' : 'is not'} during business hours` };
                        } else if (value === 'off_hours') {
                            return { result: isOffHours, reason: `Current time ${isOffHours ? 'is' : 'is not'} during off hours` };
                        }
                        return evaluateNumericCondition(currentHour, operator, value as number, 'hour');
                    case 'between':
                        if (Array.isArray(value) && value.length === 2) {
                            const [start, end] = value as [number, number];
                            const inRange = currentHour >= start && currentHour < end;
                            return { result: inRange, reason: `Current hour (${currentHour}) ${inRange ? 'is' : 'is not'} between ${start}-${end}` };
                        }
                        return { result: false, reason: 'Between operator requires array of 2 values for time' };
                    default:
                        return evaluateNumericCondition(currentHour, operator, value as number, 'hour');
                }
                
            case 'session_duration':
                const duration = context.sessionDuration || 0;
                return evaluateNumericCondition(duration, operator, value as number, 'session duration (seconds)');
                
            case 'conversation_length':
                const length = context.conversationLength || 1;
                return evaluateNumericCondition(length, operator, value as number, 'conversation length');
                
            case 'site':
                const siteId = context.siteId;
                const targetSiteId = String(value);
                
                switch (operator) {
                    case 'eq':
                        const siteMatches = siteId === targetSiteId;
                        return { result: siteMatches, reason: `Site ${siteMatches ? 'matches' : 'does not match'} "${targetSiteId}"` };
                    case 'in':
                        const siteIds = Array.isArray(value) ? value.map(v => String(v)) : [targetSiteId];
                        const siteInList = siteIds.includes(siteId || '');
                        return { result: siteInList, reason: `Site ${siteInList ? 'is' : 'is not'} in: ${siteIds.join(', ')}` };
                    default:
                        return { result: false, reason: `Unsupported site operator: ${operator}` };
                }
                
            default:
                return { result: false, reason: `Unknown condition type: ${type}` };
        }
    } catch (error) {
        return { result: false, reason: `Error evaluating condition: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}

/**
 * Helper function to evaluate numeric conditions
 */
function evaluateNumericCondition(actual: number, operator: string, expected: number, fieldName: string): { result: boolean; reason: string } {
    switch (operator) {
        case 'lt':
            return { result: actual < expected, reason: `${fieldName} (${actual}) ${actual < expected ? '<' : '>='} ${expected}` };
        case 'lte':
            return { result: actual <= expected, reason: `${fieldName} (${actual}) ${actual <= expected ? '<=' : '>'} ${expected}` };
        case 'gt':
            return { result: actual > expected, reason: `${fieldName} (${actual}) ${actual > expected ? '>' : '<='} ${expected}` };
        case 'gte':
            return { result: actual >= expected, reason: `${fieldName} (${actual}) ${actual >= expected ? '>=' : '<'} ${expected}` };
        case 'eq':
            return { result: actual === expected, reason: `${fieldName} (${actual}) ${actual === expected ? '==' : '!='} ${expected}` };
        case 'ne':
            return { result: actual !== expected, reason: `${fieldName} (${actual}) ${actual !== expected ? '!=' : '=='} ${expected}` };
        default:
            return { result: false, reason: `Unsupported numeric operator: ${operator}` };
    }
}

/**
 * Evaluate a predicate (which can contain nested conditions and predicates)
 */
function evaluatePredicate(predicate: RulePredicate, context: EvaluationContext): EvaluationResult {
    const details: EvaluationResult['details'] = [];
    const results: boolean[] = [];
    
    for (const item of predicate.conditions) {
        if ('type' in item) {
            // It's a condition
            const result = evaluateCondition(item, context);
            details.push({
                condition: item,
                result: result.result,
                reason: result.reason
            });
            results.push(result.result);
        } else {
            // It's a nested predicate
            const nestedResult = evaluatePredicate(item, context);
            details.push({
                condition: item,
                result: nestedResult.matched,
                reason: `Nested ${item.operator.toUpperCase()} condition ${nestedResult.matched ? 'matched' : 'did not match'}`
            });
            details.push(...nestedResult.details);
            results.push(nestedResult.matched);
        }
    }
    
    const matched = predicate.operator === 'and' 
        ? results.every(r => r)
        : results.some(r => r);
    
    return { matched, details };
}

/**
 * Main function to evaluate rule conditions
 */
export function evaluateRuleConditions(predicate: RulePredicate, context: EvaluationContext): EvaluationResult {
    if (!predicate || !predicate.conditions || predicate.conditions.length === 0) {
        return {
            matched: false,
            details: [{
                condition: predicate,
                result: false,
                reason: 'No conditions defined'
            }]
        };
    }
    
    return evaluatePredicate(predicate, context);
}

/**
 * Get available condition types for the rule builder
 */
export function getAvailableConditionTypes() {
    return [
        {
            type: 'confidence',
            label: 'Confidence Score',
            description: 'AI confidence in the response (0.0 - 1.0)',
            operators: ['lt', 'lte', 'gt', 'gte', 'eq'],
            valueType: 'number'
        },
        {
            type: 'keyword',
            label: 'Message Keywords',
            description: 'Keywords found in user message',
            operators: ['contains', 'not_contains', 'in'],
            valueType: 'string'
        },
        {
            type: 'email_domain',
            label: 'Email Domain',
            description: 'Domain of user email address',
            operators: ['eq', 'contains', 'in'],
            valueType: 'string'
        },
        {
            type: 'time',
            label: 'Time of Day',
            description: 'Current time or business hours',
            operators: ['eq', 'between', 'lt', 'gt'],
            valueType: 'mixed'
        },
        {
            type: 'session_duration',
            label: 'Session Duration',
            description: 'How long user has been active (seconds)',
            operators: ['lt', 'lte', 'gt', 'gte'],
            valueType: 'number'
        },
        {
            type: 'conversation_length',
            label: 'Conversation Length',
            description: 'Number of messages in conversation',
            operators: ['lt', 'lte', 'gt', 'gte', 'eq'],
            valueType: 'number'
        },
        {
            type: 'site',
            label: 'Website',
            description: 'Which site the message came from',
            operators: ['eq', 'in'],
            valueType: 'site'
        }
    ];
}
