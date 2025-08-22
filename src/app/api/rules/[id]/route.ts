import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
        }

        const { rows } = await query(
            `SELECT er.*, 
                    ts.name as site_name,
                    ts.domain as site_domain,
                    COUNT(io.id)::int as execution_count,
                    MAX(io.created_at) as last_execution
             FROM public.escalation_rules er
             LEFT JOIN public.tenant_sites ts ON ts.id = er.site_id
             LEFT JOIN public.integration_outbox io ON io.rule_id = er.id
             WHERE er.id = $1 AND er.tenant_id = $2
             GROUP BY er.id, ts.name, ts.domain`,
            [id, tenantId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Error fetching escalation rule:', error);
        return NextResponse.json({ error: 'Failed to fetch escalation rule' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await ctx.params;
        const body = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
        }

        const {
            name,
            description,
            predicate,
            conditions,
            destinations,
            priority,
            enabled,
            ruleType,
            siteId
        } = body;

        // Build dynamic update query
        const updates: string[] = [];
        const params: unknown[] = [id, tenantId];
        let paramIndex = 3;

        if (name !== undefined) {
            if (!name?.trim()) {
                return NextResponse.json({ error: 'Rule name cannot be empty' }, { status: 400 });
            }
            updates.push(`name = $${paramIndex++}`);
            params.push(name.trim());
        }

        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            params.push(description?.trim() || null);
        }

        // Accept either predicate (legacy) or conditions (new standard)
        const ruleConditions = conditions || predicate;
        if (ruleConditions !== undefined) {
            if (!ruleConditions || typeof ruleConditions !== 'object') {
                return NextResponse.json({ error: 'Valid rule conditions are required' }, { status: 400 });
            }
            updates.push(`conditions = $${paramIndex++}`);
            params.push(JSON.stringify(ruleConditions));
        }

        if (destinations !== undefined) {
            if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
                return NextResponse.json({ error: 'At least one destination is required' }, { status: 400 });
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

            updates.push(`destinations = $${paramIndex++}`);
            params.push(JSON.stringify(destinations));
        }

        if (priority !== undefined) {
            updates.push(`priority = $${paramIndex++}`);
            params.push(priority);
        }

        if (enabled !== undefined) {
            updates.push(`enabled = $${paramIndex++}`);
            params.push(enabled);
        }

        if (ruleType !== undefined) {
            const validRuleTypes = ['escalation', 'routing', 'notification'];
            if (!validRuleTypes.includes(ruleType)) {
                return NextResponse.json({ error: 'Invalid rule type' }, { status: 400 });
            }
            updates.push(`rule_type = $${paramIndex++}`);
            params.push(ruleType);
        }

        if (siteId !== undefined) {
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
            updates.push(`site_id = $${paramIndex++}`);
            params.push(siteId);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        // Add updated_at
        updates.push(`updated_at = NOW()`);

        await query(
            `UPDATE public.escalation_rules SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2`,
            params
        );

        return NextResponse.json({ message: 'Rule updated successfully' });
    } catch (error) {
        console.error('Error updating escalation rule:', error);
        return NextResponse.json({ error: 'Failed to update escalation rule' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
        }

        // Check if rule exists and belongs to tenant
        const checkResult = await query(
            'SELECT id FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (checkResult.rowCount === 0) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        // Delete rule (outbox entries will have rule_id set to null due to ON DELETE SET NULL)
        await query('DELETE FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

        return NextResponse.json({ message: 'Rule deleted successfully' });
    } catch (error) {
        console.error('Error deleting escalation rule:', error);
        return NextResponse.json({ error: 'Failed to delete escalation rule' }, { status: 500 });
    }
}
