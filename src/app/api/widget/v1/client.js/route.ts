import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { withWidgetCORS } from '@/lib/cors';

export const runtime = 'nodejs';

export async function OPTIONS(req: NextRequest) {
    return withWidgetCORS(new NextResponse(null, { status: 204 }), req);
}

export async function GET(req: NextRequest) {
    try {
        // Read the client.js file from public directory
        const clientJsPath = join(process.cwd(), 'public', 'widget', 'v1', 'client.js');
        const clientJsContent = await readFile(clientJsPath, 'utf-8');

        const response = new NextResponse(clientJsContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            }
        });

        return withWidgetCORS(response, req);

    } catch (error) {
        console.error('Error serving client.js:', error);
        const errorResponse = new NextResponse('Client script not found', { status: 404 });
        return withWidgetCORS(errorResponse, req);
    }
}
