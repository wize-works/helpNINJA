import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
    // Marketing/public pages
    '/',
    '/auth(.*)',
    '/pricing',
    '/features',
    '/about',
    '/contact',

    // Widget and chat endpoints - must be public for visitors
    '/api/widget(.*)',
    '/api/chat(.*)',
    '/api/escalate(.*)',
    '/api/feedback(.*)',

    // Authentication endpoints
    '/api/signup(.*)',
    '/api/clerk/webhook(.*)',

    // Payment processing
    '/api/stripe/webhook(.*)',

    // Other public webhooks (if any)
    '/api/webhooks/(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) return;
    const { userId, redirectToSignIn } = await auth();
    if (!userId) return redirectToSignIn();
});

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api)(.*)'],
};