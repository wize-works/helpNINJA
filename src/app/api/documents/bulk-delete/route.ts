import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getTenantIdStrict } from '@/lib/tenant-resolve'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    const tenantId = await getTenantIdStrict()

    try {
        const { documentIds } = await req.json()

        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return NextResponse.json({ error: 'documentIds array is required' }, { status: 400 })
        }

        // Validate that all documents belong to this tenant
        const placeholders = documentIds.map((_, i) => `$${i + 2}`).join(',')
        const validateQuery = `
            SELECT id FROM public.documents 
            WHERE tenant_id = $1 AND id IN (${placeholders})
        `
        const validateResult = await query(validateQuery, [tenantId, ...documentIds])

        if (validateResult.rowCount !== documentIds.length) {
            return NextResponse.json({ error: 'Some documents do not exist or do not belong to this tenant' }, { status: 403 })
        }

        // Delete chunks first (foreign key constraint)
        const deleteChunksQuery = `
            DELETE FROM public.chunks 
            WHERE tenant_id = $1 AND document_id IN (${placeholders})
        `
        await query(deleteChunksQuery, [tenantId, ...documentIds])

        // Delete documents
        const deleteDocsQuery = `
            DELETE FROM public.documents 
            WHERE tenant_id = $1 AND id IN (${placeholders})
        `
        const result = await query(deleteDocsQuery, [tenantId, ...documentIds])

        return NextResponse.json({
            ok: true,
            deletedCount: result.rowCount,
            deletedIds: documentIds
        })
    } catch (e) {
        console.error('Bulk delete error:', e)
        return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
}
