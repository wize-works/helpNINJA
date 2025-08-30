import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

// File upload limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_REQUEST = 5;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json'
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.txt', '.csv', '.json', '.log'
];

/**
 * POST /api/feedback/attachments - Upload files for feedback
 */
export async function POST(req: NextRequest) {
  try {
    // Handle both authenticated (dashboard) and widget submissions
    let tenantId: string;
    
    // Parse multipart form data
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const feedbackId = formData.get('feedbackId') as string;
    const requestTenantId = formData.get('tenantId') as string;
    
    // Debug logging to see what we received
    console.log('Attachment upload - feedbackId:', feedbackId);
    console.log('Attachment upload - tenantId:', requestTenantId);
    console.log('Attachment upload - files count:', files.length);

    // Try authenticated first, then fall back to tenantId from form data (widget)
    try {
      tenantId = await getTenantIdStrict();
    } catch {
      if (!requestTenantId) {
        return NextResponse.json(
          { error: 'tenantId is required for widget submissions' },
          { status: 400 }
        );
      }
      tenantId = requestTenantId;
    }

    // Validation
    if (!feedbackId) {
      return NextResponse.json(
        { error: 'feedbackId is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_REQUEST} files allowed per request` },
        { status: 400 }
      );
    }

    // Verify feedback exists and belongs to tenant
    const { rows: feedbackRows } = await query(
      'SELECT id FROM public.feedback WHERE id = $1 AND tenant_id = $2',
      [feedbackId, tenantId]
    );

    if (feedbackRows.length === 0) {
      return NextResponse.json(
        { error: 'Feedback not found or access denied' },
        { status: 404 }
      );
    }

    const uploadResults = [];
    const uploadDir = join(process.cwd(), 'uploads', 'feedback', tenantId);

    // Ensure upload directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    for (const file of files) {
      try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
          uploadResults.push({
            filename: file.name,
            success: false,
            error: validation.error
          });
          continue;
        }

        // Generate unique filename
        const fileExtension = getFileExtension(file.name);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const filepath = join(uploadDir, uniqueFilename);
        const storagePath = `feedback/${tenantId}/${uniqueFilename}`;

        // Save file to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Save attachment record to database
        const { rows: attachmentRows } = await query(
          `INSERT INTO public.feedback_attachments 
           (feedback_id, filename, original_filename, mime_type, file_size, storage_path, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            feedbackId,
            uniqueFilename,
            file.name,
            file.type,
            file.size,
            storagePath,
            null // description can be added later
          ]
        );

        uploadResults.push({
          id: attachmentRows[0].id,
          filename: file.name,
          size: file.size,
          type: file.type,
          success: true,
          storagePath
        });

      } catch (error) {
        console.error('File upload error:', error);
        uploadResults.push({
          filename: file.name,
          success: false,
          error: 'Upload failed'
        });
      }
    }

    // Count successful uploads
    const successCount = uploadResults.filter(r => r.success).length;
    const failureCount = uploadResults.length - successCount;

    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount} file(s) uploaded successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results: uploadResults,
      feedbackId
    });

  } catch (error) {
    console.error('Attachment upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback/attachments?feedbackId=xxx - Get attachments for feedback
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantIdStrict();
    const { searchParams } = new URL(req.url);
    const feedbackId = searchParams.get('feedbackId');

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'feedbackId is required' },
        { status: 400 }
      );
    }

    // Verify feedback exists and belongs to tenant
    const { rows: feedbackRows } = await query(
      'SELECT id FROM public.feedback WHERE id = $1 AND tenant_id = $2',
      [feedbackId, tenantId]
    );

    if (feedbackRows.length === 0) {
      return NextResponse.json(
        { error: 'Feedback not found or access denied' },
        { status: 404 }
      );
    }

    // Get attachments
    const { rows: attachments } = await query(
      `SELECT id, filename, original_filename, mime_type, file_size, 
              storage_path, description, created_at
       FROM public.feedback_attachments 
       WHERE feedback_id = $1 
       ORDER BY created_at DESC`,
      [feedbackId]
    );

    return NextResponse.json({
      feedbackId,
      attachments: attachments.map(att => ({
        id: att.id,
        filename: att.original_filename,
        size: att.file_size,
        type: att.mime_type,
        description: att.description,
        createdAt: att.created_at,
        downloadUrl: `/api/feedback/attachments/${att.id}/download`
      }))
    });

  } catch (error) {
    console.error('Get attachments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate uploaded file
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(MAX_FILE_SIZE)})`
    };
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    const extension = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
      return {
        valid: false,
        error: `File type not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
      };
    }
  }

  // Check filename
  if (!file.name || file.name.length > 255) {
    return {
      valid: false,
      error: 'Invalid filename'
    };
  }

  // Basic security check - reject files with dangerous names
  const dangerousPatterns = [
    /\.\./,  // path traversal
    /[<>:"|?*]/,  // invalid characters
    /\.(exe|bat|cmd|scr|ps1)$/i  // executable files
  ];

  if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
    return {
      valid: false,
      error: 'Filename contains invalid characters or is not allowed'
    };
  }

  return { valid: true };
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.substring(lastDot) : '';
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
