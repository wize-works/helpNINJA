'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const docsNavigation = [
    {
        title: 'Getting Started',
        href: '/docs',
        icon: 'fa-duotone fa-solid fa-rocket'
    },
    {
        title: 'Widget Installation',
        href: '/docs/widget-installation',
        icon: 'fa-duotone fa-solid fa-wrench'
    },
    {
        title: 'Dashboard Guide',
        href: '/docs/dashboard',
        icon: 'fa-duotone fa-solid fa-chart-line'
    },
    {
        title: 'Integrations',
        href: '/docs/integrations',
        icon: 'fa-duotone fa-solid fa-link'
    },
    {
        title: 'Billing & Plans',
        href: '/docs/billing',
        icon: 'fa-duotone fa-solid fa-credit-card'
    },
    {
        title: 'Troubleshooting',
        href: '/docs/troubleshooting',
        icon: 'fa-duotone fa-solid fa-tools'
    }
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <nav className="sticky top-8">
                            <div className="bg-base-200 rounded-lg p-4">
                                <h3 className="font-semibold text-base-content mb-4">Documentation</h3>
                                <ul className="space-y-2">
                                    {docsNavigation.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <li key={item.href}>
                                                <Link
                                                    href={item.href}
                                                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                                                        ? 'bg-primary text-primary-content'
                                                        : 'text-base-content hover:bg-base-300'
                                                        }`}
                                                >
                                                    <i className={`${item.icon} text-lg`}></i>
                                                    <span>{item.title}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            {/* Quick Links */}
                            <div className="bg-base-200 rounded-lg p-4 mt-4">
                                <h3 className="font-semibold text-base-content mb-4">Quick Links</h3>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        <a
                                            href="https://helpninja.app"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            <i className="fa-duotone fa-solid fa-globe mr-2"></i>Main Website
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="mailto:support@helpninja.app"
                                            className="text-primary hover:underline"
                                        >
                                            <i className="fa-duotone fa-solid fa-envelope mr-2"></i>Contact Support
                                        </a>
                                    </li>
                                    <li>
                                        <Link href="/docs/troubleshooting" className="text-primary hover:underline">
                                            <i className="fa-duotone fa-solid fa-circle-exclamation text-red-500 mr-2"></i>Need Help?
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        <div className="prose prose-lg max-w-none">
                            {children}
                        </div>
                    </main>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-base-300 bg-base-200 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center text-base-content/60">
                        <p>&copy; 2025 helpNINJA. All rights reserved.</p>
                        <p className="mt-2">
                            Need more help? {' '}
                            <a
                                href="mailto:support@helpninja.app"
                                className="text-primary hover:underline"
                            >
                                Contact our support team
                            </a>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}