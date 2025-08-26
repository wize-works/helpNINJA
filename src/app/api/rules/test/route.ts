import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { evaluateRuleConditions } from '@/lib/rule-engine';

export const runtime = 'nodejs';

/**
 * API route to test rule evaluation against a message
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tenantId, message, ruleId } = body;

        // Validate required fields
        if (!tenantId || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get the specific rule or all rules
        const { rows: rules } = await query(
            `SELECT * FROM public.escalation_rules 
             WHERE tenant_id = $1 
             AND enabled = true 
             AND rule_type = 'escalation'
             ${ruleId ? 'AND id = $2' : ''}
             ORDER BY priority DESC`,
            ruleId ? [tenantId, ruleId] : [tenantId]
        );

        if (rules.length === 0) {
            return NextResponse.json({
                error: 'No active rules found',
                message: ruleId
                    ? `No active rule found with ID: ${ruleId}`
                    : 'No active rules found for this tenant'
            }, { status: 404 });
        }

        // Prepare evaluation context
        const context = {
            message,
            confidence: 0.7,
            keywords: [], // Extract keywords if available
            timestamp: new Date()
        };

        // Evaluate each rule
        const results = rules.map(rule => {
            const conditions = rule.conditions || { operator: 'and', conditions: [] };
            const result = evaluateRuleConditions(conditions, context);

            return {
                ruleId: rule.id,
                name: rule.name,
                description: rule.description,
                matched: result.matched,
                details: result.details
            };
        });

        const matchedRules = results.filter(r => r.matched);

        return NextResponse.json({
            message,
            matchedRules: matchedRules.length,
            totalRules: rules.length,
            results
        });
    } catch (error) {
        console.error('Error in rule evaluation test API:', error);
        return NextResponse.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
