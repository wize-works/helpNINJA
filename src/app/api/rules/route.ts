import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId');
        const enabled = searchParams.get('enabled');
        const ruleType = searchParams.get('type');
        
        let queryText = `
            SELECT er.*, 
                   ts.name as site_name,
                   ts.domain as site_domain,
                   COUNT(io.id)::int as execution_count,
                   MAX(io.created_at) as last_execution
            FROM public.escalation_rules er
            LEFT JOIN public.tenant_sites ts ON ts.id = er.site_id
            LEFT JOIN public.integration_outbox io ON io.rule_id = er.id
            WHERE er.tenant_id = $1
        `;
        
        const params: unknown[] = [tenantId];
        let paramIndex = 2;
        
        if (siteId) {
            queryText += ` AND er.site_id = $${paramIndex++}`;
            params.push(siteId);
        }
        
        if (enabled !== null && enabled !== undefined) {
            queryText += ` AND er.enabled = $${paramIndex++}`;
            params.push(enabled === 'true');
        }
        
        if (ruleType) {
            queryText += ` AND er.rule_type = $${paramIndex++}`;
            params.push(ruleType);
        }
        
        queryText += `
            GROUP BY er.id, ts.name, ts.domain
            ORDER BY er.priority DESC, er.created_at DESC
        `;
        
        const { rows } = await query(queryText, params);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching escalation rules:', error);
        return NextResponse.json({ error: 'Failed to fetch escalation rules' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const body = await req.json();
        const { 
            name, 
            description, 
            predicate, 
            destinations, 
            priority, 
            enabled, 
            ruleType,
            siteId 
        } = body;
        
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Rule name is required' }, { status: 400 });
        }
        
        if (!predicate || typeof predicate !== 'object') {
            return NextResponse.json({ error: 'Valid predicate is required' }, { status: 400 });
        }
        
        if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
            return NextResponse.json({ error: 'At least one destination is required' }, { status: 400 });
        }
        
        // Validate rule type
        const validRuleTypes = ['escalation', 'routing', 'notification'];
        if (ruleType && !validRuleTypes.includes(ruleType)) {
            return NextResponse.json({ error: 'Invalid rule type' }, { status: 400 });
        }
        
        // Validate siteId if provided
        if (siteId) {
            const siteCheck = await query(
                'SELECT id FROM public.tenant_sites WHERE id = $1 AND tenant_id = $2',
                [siteId, tenantId]
            );
            if (siteCheck.rowCount === 0) {
                return NextResponse.json({ error: 'Invalid siteId for this tenant' }, { status: 400 });
            }
        }
        
        // Validate destinations reference valid integrations
        for (const dest of destinations) {
            if (dest.type === 'integration' && dest.integrationId) {
                const integrationCheck = await query(
                    'SELECT id FROM public.integrations WHERE id = $1 AND tenant_id = $2',
                    [dest.integrationId, tenantId]
                );
                if (integrationCheck.rowCount === 0) {
                    return NextResponse.json({ 
                        error: `Invalid integration ID: ${dest.integrationId}` 
                    }, { status: 400 });
                }
            }
        }
        
        // Insert rule
        const { rows } = await query(
            `INSERT INTO public.escalation_rules (
                tenant_id, name, description, predicate, destinations, 
                priority, enabled, rule_type, site_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING id`,
            [
                tenantId,
                name.trim(),
                description?.trim() || null,
                JSON.stringify(predicate),
                JSON.stringify(destinations),
                priority || 0,
                enabled !== false, // default to true
                ruleType || 'escalation',
                siteId || null
            ]
        );
        
        return NextResponse.json({ 
            id: rows[0].id, 
            message: 'Escalation rule created successfully' 
        });
    } catch (error) {
        console.error('Error creating escalation rule:', error);
        return NextResponse.json({ error: 'Failed to create escalation rule' }, { status: 500 });
    }
}
