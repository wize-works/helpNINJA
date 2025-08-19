import { NextResponse } from 'next/server';

export const runtime = 'edge';

// This route handles Clerk's server action for email verification
// It should proxy the request to Clerk's verification endpoint
export async function POST() {
    try {
        // For now, return a helpful message
        // Clerk should handle this automatically through their middleware
        return NextResponse.json(
            { error: 'This endpoint should be handled by Clerk automatically' },
            { status: 404 }
        );
    } catch (error) {
        console.error('Verify route error:', error);
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        );
    }
}
