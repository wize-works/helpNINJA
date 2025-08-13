import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { searchParams } = new URL(req.url);
        const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30');
        const status = searchParams.get('status') || 'sent'; // Default to cleaning up sent items
        
        if (olderThanDays < 1 || olderThanDays > 365) {
            return NextResponse.json({ error: 'olderThanDays must be between 1 and 365' }, { status: 400 });
        }
        
        const validStatuses = ['sent', 'failed', 'pending'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status. Must be one of: sent, failed, pending' }, { status: 400 });
        }
        
        // Get count before deletion
        const countResult = await query(
            `SELECT COUNT(*)::int as count 
             FROM public.integration_outbox 
             WHERE tenant_id = $1 
             AND status = $2 
             AND created_at < NOW() - INTERVAL '${olderThanDays} days'`,
            [tenantId, status]
        );
        
        const itemsToDelete = countResult.rows[0]?.count || 0;
        
        if (itemsToDelete === 0) {
            return NextResponse.json({
                message: `No ${status} items older than ${olderThanDays} days found`,
                deleted: 0
            });
        }
        
        // Delete the items
        const deleteResult = await query(
            `DELETE FROM public.integration_outbox 
             WHERE tenant_id = $1 
             AND status = $2 
             AND created_at < NOW() - INTERVAL '${olderThanDays} days'`,
            [tenantId, status]
        );
        
        return NextResponse.json({
            message: `Deleted ${itemsToDelete} ${status} items older than ${olderThanDays} days`,
            deleted: itemsToDelete
        });
        
    } catch (error) {
        console.error('Error cleaning up outbox:', error);
        return NextResponse.json({ error: 'Failed to cleanup outbox' }, { status: 500 });
    }
}
