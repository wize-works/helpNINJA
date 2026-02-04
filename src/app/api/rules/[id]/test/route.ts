import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { evaluateRuleConditions } from '@/lib/rule-engine';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Context) {
    try {
        console.log('🔍 Rule test - Starting authentication...');
        const tenantId = await getTenantIdStrict();
        console.log('✅ Rule test - Authentication successful, tenantId:', tenantId);
        const { id } = await ctx.params;
        const body = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
        }

        // Get the rule
        const { rows: ruleRows } = await query(
            'SELECT conditions FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (ruleRows.length === 0) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        const rule = ruleRows[0];
        // For compatibility with frontend that still uses predicate
        const rulePredicate = rule.conditions;

        // Extract test context from request body
        const testContext = {
            message: body.message || 'Test message',
            confidence: body.confidence || 0.5,
            keywords: body.keywords || [],
            userEmail: body.userEmail || 'test@helpninja.ai',
            timestamp: new Date(),
            siteId: body.siteId || null,
            sessionDuration: body.sessionDuration || 300, // 5 minutes
            isOffHours: body.isOffHours || false,
            conversationLength: body.conversationLength || 1
        };

        // Evaluate the rule conditions
        const result = evaluateRuleConditions(rulePredicate, testContext);

        return NextResponse.json({
            matched: result.matched,
            details: result.details,
            testContext,
            conditions: rulePredicate
        });
    } catch (error) {
        console.error('Error testing escalation rule:', error);
        return NextResponse.json({ error: 'Failed to test escalation rule' }, { status: 500 });
    }
}
