import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3001'),
    title: {
        default: 'helpNINJA',
        template: '%s · helpNINJA',
    },
    description: '#1 AI Customer Support Agent',
    icons: {
        icon: [
            // Prioritize .ico so browsers reliably pick it up
            {
                url: '/favicon.ico',
                type: 'image/x-icon',
            },
            // Provide SVG as an additional option for supporting browsers
            {
                url: '/logo.svg',
                type: 'image/svg+xml',
            },
        ],
        // Include a shortcut icon for compatibility
        shortcut: '/favicon.ico',
        // Apple touch icon for iOS devices prefers PNG
        apple: {
            url: '/logo.png',
            type: 'image/png',
        },
    },
    // SEO: Open Graph for social sharing
    openGraph: {
        type: 'website',
        siteName: 'helpNINJA',
        title: 'helpNINJA',
        description: '#1 AI Customer Support Agent',
        url: '/',
        images: [
            { url: '/logo.png', width: 1200, height: 630, alt: 'helpNINJA' },
        ],
    },
    // SEO: Twitter cards
    twitter: {
        card: 'summary_large_image',
        title: 'helpNINJA',
        description: '#1 AI Customer Support Agent',
        images: ['/logo.png'],
        creator: '@wizeworks',
        site: '@wizeworks',
    },
    // SEO: robots and canonical
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
        },
    },
    alternates: {
        canonical: '/',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0b0b0b' },
    ],
};
