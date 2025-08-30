import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

/**
 * GET /api/feedback/attachments/[id]/download - Download attachment file
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantIdStrict();
    const { id: attachmentId } = await params;

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID is required' },
        { status: 400 }
      );
    }

    // Get attachment info and verify access
    const { rows: attachmentRows } = await query(
      `SELECT fa.*, f.tenant_id 
       FROM public.feedback_attachments fa
       JOIN public.feedback f ON f.id = fa.feedback_id
       WHERE fa.id = $1`,
      [attachmentId]
    );

    if (attachmentRows.length === 0) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    const attachment = attachmentRows[0];

    // Verify tenant access
    if (attachment.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build file path
    const filepath = join(process.cwd(), 'uploads', attachment.storage_path);

    // Check if file exists
    if (!existsSync(filepath)) {
      console.error(`File not found: ${filepath}`);
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

    try {
      // Read file
      const fileBuffer = await readFile(filepath);

      // Set appropriate headers
      const headers = new Headers();
      headers.set('Content-Type', attachment.mime_type || 'application/octet-stream');
      headers.set('Content-Length', attachment.file_size.toString());
      headers.set('Content-Disposition', `attachment; filename="${attachment.original_filename}"`);
      headers.set('Cache-Control', 'private, max-age=0');
      
      // Security headers
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');

      return new NextResponse(fileBuffer as BodyInit, {
        status: 200,
        headers
      });

    } catch (fileError) {
      console.error('File read error:', fileError);
      return NextResponse.json(
        { error: 'Failed to read file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feedback/attachments/[id]/download - Delete attachment
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantIdStrict();
    const { id: attachmentId } = await params;

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID is required' },
        { status: 400 }
      );
    }

    // Get attachment info and verify access
    const { rows: attachmentRows } = await query(
      `SELECT fa.*, f.tenant_id 
       FROM public.feedback_attachments fa
       JOIN public.feedback f ON f.id = fa.feedback_id
       WHERE fa.id = $1`,
      [attachmentId]
    );

    if (attachmentRows.length === 0) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    const attachment = attachmentRows[0];

    // Verify tenant access
    if (attachment.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete from database
    await query(
      'DELETE FROM public.feedback_attachments WHERE id = $1',
      [attachmentId]
    );

    // Try to delete file from disk (best effort)
    try {
      const filepath = join(process.cwd(), 'uploads', attachment.storage_path);
      if (existsSync(filepath)) {
        const { unlink } = await import('fs/promises');
        await unlink(filepath);
      }
    } catch (fileError) {
      console.warn('Failed to delete file from disk:', fileError);
      // Don't fail the request if file deletion fails
    }

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully'
    });

  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
