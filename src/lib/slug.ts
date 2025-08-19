import { query } from './db';

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlugFromName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .substring(0, 50) // Limit length
        || 'workspace'; // Fallback if name produces empty slug
}

/**
 * Check if a slug is already taken
 */
export async function isSlugTaken(slug: string): Promise<boolean> {
    try {
        const result = await query(
            'SELECT 1 FROM public.tenants WHERE slug = $1 LIMIT 1',
            [slug]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error checking slug availability:', error);
        return true; // Err on the side of caution
    }
}

/**
 * Generate a unique slug from a name by appending numbers if needed
 */
export async function generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = generateSlugFromName(name);

    // Check if base slug is available
    if (!(await isSlugTaken(baseSlug))) {
        return baseSlug;
    }

    // Try appending numbers until we find an available slug
    let counter = 1;
    let candidateSlug = `${baseSlug}-${counter}`;

    while (await isSlugTaken(candidateSlug)) {
        counter++;
        candidateSlug = `${baseSlug}-${counter}`;

        // Safety net to prevent infinite loops
        if (counter > 1000) {
            // Generate a random suffix as last resort
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            candidateSlug = `${baseSlug}-${randomSuffix}`;
            break;
        }
    }

    return candidateSlug;
}
