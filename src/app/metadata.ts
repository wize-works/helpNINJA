import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'helpNINJA',
    description: 'AI chat widget with RAG search on tenant-ingested documents',
    icons: {
        icon: [
            {
                url: '/logo.svg',
                type: 'image/svg+xml',
            },
            {
                url: '/favicon.ico',
                sizes: '32x32',
                type: 'image/x-icon',
            },
        ],
        // Include a shortcut icon for compatibility
        shortcut: '/favicon.ico',
        // Apple touch icon for iOS devices
        apple: {
            url: '/logo.svg',
            type: 'image/svg+xml',
        },
    },
    // Add Open Graph metadata for better social sharing
    openGraph: {
        title: 'helpNINJA',
        description: 'AI chat widget with RAG search on tenant-ingested documents',
        images: [
            {
                url: '/logo.svg',
                width: 800,
                height: 600,
                alt: 'helpNINJA Logo',
            }
        ],
    },
};
