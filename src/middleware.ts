import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
    // Marketing/public pages
    '/',
    '/auth(.*)',
    '/pricing',
    '/features',
    '/about',
    '/contact',

    // Invitation pages - must be public for new users
    '/invite(.*)',

    // Widget and chat endpoints - must be public for visitors
    '/api/widget(.*)',
    '/api/chat(.*)',
    '/api/escalate(.*)',
    '/api/feedback(.*)',
    '/api/conversations/session/(.*)', // Allow widgets to poll for agent responses

    // Authentication and invitation endpoints
    '/api/signup(.*)',
    '/api/clerk/webhook(.*)',
    '/api/invitations(.*)', // Allow invitation acceptance without auth

    // Payment processing
    '/api/stripe/webhook(.*)',

    // Other public webhooks (if any)
    '/api/webhooks/(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) return;
    const { userId, redirectToSignIn } = await auth();
    if (!userId) {
        const pathname = req.nextUrl.pathname || '';
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        return redirectToSignIn();
    }
});

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api)(.*)'],
};