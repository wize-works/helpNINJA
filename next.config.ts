import type { NextConfig } from "next";

// Build remotePatterns list (extendable as new external image sources are introduced)
const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    {
        protocol: 'https',
        hostname: 'img.clerk.com', // Clerk user avatars
        pathname: '/**'
    }
]

// Optionally include Supabase storage bucket (for user-uploaded assets) if env var is set
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
        const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
        remotePatterns.push({
            protocol: supabase.protocol.replace(':', '') as 'http' | 'https',
            hostname: supabase.hostname,
            // Public bucket objects (adjust path if you use custom buckets)
            pathname: '/storage/v1/object/public/**'
        })
    } catch {
        // Ignore malformed URL; safer to skip than break build
    }
}

const nextConfig: NextConfig = {
    output: 'standalone',
    images: {
        remotePatterns
    }
};

export default nextConfig;
