import { query } from '@/lib/db';

export function withCORS(res: Response, origin?: string | null) {
    // Use the requesting origin if provided, otherwise allow all
    const allowOrigin = origin || '*';
    res.headers.set('Access-Control-Allow-Origin', allowOrigin);
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
}

// Enhanced CORS validation for widget endpoints
export async function isOriginAllowedForTenant(origin: string | null, tenantId: string | null): Promise<boolean> {
    // Allow null origins for widget requests (common in iframes, mobile apps, and certain browser contexts)
    if (!origin || origin === 'null') {
        // For null origins, we rely on other security measures (tenant validation, domain verification in widget script)
        return true;
    }

    try {
        // Extract domain from origin (remove protocol and port)
        const originUrl = new URL(origin);
        const domain = originUrl.hostname;

        // For localhost/development, be permissive
        if (domain === 'localhost' ||
            domain.endsWith('.localhost') ||
            domain.match(/^127\.0\.0\.1$|^0\.0\.0\.0$/) ||
            domain.match(/^192\.168\./)) {
            return true;
        }

        // If tenantId is provided, check against tenant_sites table
        if (tenantId) {
            const { rows } = await query(
                `SELECT domain FROM public.tenant_sites 
                 WHERE tenant_id = $1 AND (domain = $2 OR domain LIKE '%' || $2)`,
                [tenantId, domain]
            );

            if (rows.length > 0) {
                return true; // Domain is registered for this tenant
            }
        }

        // Fallback to environment variable for testing
        const allowedOrigins = process.env.ALLOWED_WIDGET_ORIGINS;
        if (allowedOrigins) {
            const allowlist = allowedOrigins.split(',').map(s => s.trim()).filter(Boolean);
            if (allowlist.includes(domain) || allowlist.includes(origin)) {
                return true;
            }
        }

        // Default: deny unknown origins for security
        return false;
    } catch (error) {
        console.error('Error checking origin for tenant:', error);
        // In case of database error, be permissive to avoid breaking widgets
        return true;
    }
}

// Helper for widget CORS with tenant validation
export async function withWidgetCORS(
    res: Response,
    req: { headers: { get: (name: string) => string | null } },
    tenantId?: string | null
) {
    const origin = req.headers.get('origin');

    // For widget endpoints, we want to be more permissive by default
    // but still validate against tenant sites when possible
    if (tenantId) {
        const allowed = await isOriginAllowedForTenant(origin, tenantId);
        if (!allowed) {
            console.warn(`Origin "${origin}" not allowed for tenant ${tenantId}${origin === null || origin === 'null' ? ' (null origin - possibly iframe/mobile context)' : ''}`);
            // Still allow it but log the warning - widgets should work broadly
        }
    }

    return withCORS(res, origin);
}
