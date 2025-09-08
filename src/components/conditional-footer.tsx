'use client';

import { usePathname } from 'next/navigation';
import Footer from './footer';

export default function ConditionalFooter() {
    const pathname = usePathname();

    // Don't show footer on dashboard or auth pages
    const shouldShowFooter = !pathname.startsWith('/dashboard') &&
        !pathname.startsWith('/auth') &&
        !pathname.startsWith('/api');

    return shouldShowFooter ? <Footer /> : null;
}
