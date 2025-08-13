import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

export const runtime = 'nodejs';

async function handleAuthTest(req: AuthenticatedRequest) {
    return NextResponse.json({
        tenantId: req.tenantId,
        userId: req.userId,
        apiKey: req.apiKey,
        message: 'Authentication successful'
    });
}

export const GET = withAuth(handleAuthTest);
