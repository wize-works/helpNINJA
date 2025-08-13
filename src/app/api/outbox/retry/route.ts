import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest } from '@/lib/auth';
import { dispatchEscalation } from '@/lib/integrations/dispatch';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const body = await req.json();
        const { itemIds, retryAll = false, maxAttempts = 3 } = body;
        
        if (!retryAll && (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0)) {
            return NextResponse.json({ error: 'itemIds array is required when retryAll is false' }, { status: 400 });
        }
        
        let queryText: string;
        let params: unknown[];
        
        if (retryAll) {
            // Retry all failed items for this tenant
            queryText = `
                SELECT id, provider, integration_id, payload, attempts, rule_id, conversation_id, message_context
                FROM public.integration_outbox 
                WHERE tenant_id = $1 
                AND status IN ('failed', 'pending')
                AND attempts < $2
                ORDER BY created_at ASC
            `;
            params = [tenantId, maxAttempts];
        } else {
            // Retry specific items
            queryText = `
                SELECT id, provider, integration_id, payload, attempts, rule_id, conversation_id, message_context
                FROM public.integration_outbox 
                WHERE tenant_id = $1 
                AND id = ANY($2)
                AND status IN ('failed', 'pending')
                AND attempts < $3
                ORDER BY created_at ASC
            `;
            params = [tenantId, itemIds, maxAttempts];
        }
        
        const { rows: retryItems } = await query(queryText, params);
        
        if (retryItems.length === 0) {
            return NextResponse.json({ 
                message: 'No eligible items found for retry',
                retried: 0,
                failed: 0
            });
        }
        
        let retried = 0;
        let failed = 0;
        const results: Array<{ id: string; success: boolean; error?: string }> = [];
        
        // Process each item
        for (const item of retryItems) {
            try {
                // Update status to pending and increment attempts
                await query(
                    `UPDATE public.integration_outbox 
                     SET status = 'pending', attempts = attempts + 1, next_attempt_at = NOW(), last_error = NULL
                     WHERE id = $1`,
                    [item.id]
                );
                
                // Try to dispatch the escalation
                const escalationEvent = {
                    tenantId,
                    provider: item.provider,
                    integrationId: item.integration_id,
                    ...item.payload,
                    ruleId: item.rule_id,
                    conversationId: item.conversation_id
                };
                
                await dispatchEscalation(escalationEvent);
                
                // Mark as sent if successful
                await query(
                    `UPDATE public.integration_outbox 
                     SET status = 'sent', sent_at = NOW()
                     WHERE id = $1`,
                    [item.id]
                );
                
                retried++;
                results.push({ id: item.id, success: true });
                
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                
                // Mark as failed with error details
                await query(
                    `UPDATE public.integration_outbox 
                     SET status = 'failed', last_error = $1
                     WHERE id = $2`,
                    [errorMessage, item.id]
                );
                
                failed++;
                results.push({ id: item.id, success: false, error: errorMessage });
            }
        }
        
        return NextResponse.json({
            message: `Retry completed: ${retried} successful, ${failed} failed`,
            retried,
            failed,
            totalProcessed: retryItems.length,
            results
        });
        
    } catch (error) {
        console.error('Error processing retry:', error);
        return NextResponse.json({ error: 'Failed to process retry' }, { status: 500 });
    }
}
