import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest } from '@/lib/auth';
import { evaluateRuleConditions } from '@/lib/rule-engine';

export const runtime = 'nodejs';

type Context = { params: { id: string } };

export async function POST(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { id } = ctx.params;
        const body = await req.json();
        
        if (!id) {
            return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
        }
        
        // Get the rule
        const { rows: ruleRows } = await query(
            'SELECT predicate FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );
        
        if (ruleRows.length === 0) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }
        
        const rule = ruleRows[0];
        
        // Extract test context from request body
        const testContext = {
            message: body.message || 'Test message',
            confidence: body.confidence || 0.5,
            keywords: body.keywords || [],
            userEmail: body.userEmail || 'test@example.com',
            timestamp: new Date(),
            siteId: body.siteId || null,
            sessionDuration: body.sessionDuration || 300, // 5 minutes
            isOffHours: body.isOffHours || false,
            conversationLength: body.conversationLength || 1
        };
        
        // Evaluate the rule conditions
        const result = evaluateRuleConditions(rule.predicate, testContext);
        
        return NextResponse.json({
            matched: result.matched,
            details: result.details,
            testContext,
            predicate: rule.predicate
        });
    } catch (error) {
        console.error('Error testing escalation rule:', error);
        return NextResponse.json({ error: 'Failed to test escalation rule' }, { status: 500 });
    }
}
