import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
    '/',
    '/auth(.*)',
    '/pricing',
    '/features',
    '/about',
    '/contact',
    // widget/chat must be public for visitors
    '/api/widget(.*)',
    '/api/chat(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) return;
    const { userId, redirectToSignIn } = await auth();
    if (!userId) return redirectToSignIn();
});

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api)(.*)'],
};
