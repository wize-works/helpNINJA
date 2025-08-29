import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await params;

        const { rows } = await query(
            `SELECT * FROM public.integrations WHERE tenant_id = $1 AND id = $2`,
            [tenantId, id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Error fetching integration:', error);
        return NextResponse.json({ error: 'Failed to fetch integration' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await params;
        const body = await req.json();

        // Validate required fields
        if (!body.name && !body.config && !body.credentials && body.status === undefined) {
            return NextResponse.json({ error: 'At least one field must be provided for update' }, { status: 400 });
        }

        // Check if integration exists and belongs to tenant
        const { rows: existingRows } = await query(
            `SELECT id FROM public.integrations WHERE tenant_id = $1 AND id = $2`,
            [tenantId, id]
        );

        if (existingRows.length === 0) {
            return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
        }

        // Build dynamic update query
        const updateFields: string[] = [];
        const updateValues: unknown[] = [tenantId, id];
        let paramIndex = 3;

        if (body.name !== undefined) {
            updateFields.push(`name = $${paramIndex++}`);
            updateValues.push(body.name);
        }

        if (body.config !== undefined) {
            updateFields.push(`config = $${paramIndex++}`);
            updateValues.push(JSON.stringify(body.config));
        }

        if (body.credentials !== undefined) {
            updateFields.push(`credentials = $${paramIndex++}`);
            updateValues.push(JSON.stringify(body.credentials));
        }

        if (body.status !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            updateValues.push(body.status);
        }

        // Always update the updated_at timestamp
        updateFields.push(`updated_at = NOW()`);

        const updateQuery = `
            UPDATE public.integrations 
            SET ${updateFields.join(', ')}
            WHERE tenant_id = $1 AND id = $2
            RETURNING *
        `;

        const { rows } = await query(updateQuery, updateValues);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Error updating integration:', error);
        return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await params;

        // Check if integration exists and belongs to tenant
        const { rows: existingRows } = await query(
            `SELECT id, name FROM public.integrations WHERE tenant_id = $1 AND id = $2`,
            [tenantId, id]
        );

        if (existingRows.length === 0) {
            return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
        }

        // Delete the integration
        const { rows } = await query(
            `DELETE FROM public.integrations WHERE tenant_id = $1 AND id = $2 RETURNING id, name`,
            [tenantId, id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 });
        }

        return NextResponse.json({ 
            message: 'Integration deleted successfully',
            deleted: rows[0]
        });
    } catch (error) {
        console.error('Error deleting integration:', error);
        return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 });
    }
}