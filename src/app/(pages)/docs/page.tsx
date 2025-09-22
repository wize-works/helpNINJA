import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Help Center - helpNINJA',
    description: 'Complete documentation and guides for using helpNINJA AI-powered customer support platform.',
};

const quickStartCards = [
    {
        title: 'Widget Installation',
        description: 'Add the helpNINJA chat widget to your website in minutes',
        href: '/docs/widget-installation',
        icon: 'fa-duotone fa-solid fa-wrench',
        time: '5 min read'
    },
    {
        title: 'Dashboard Guide',
        description: 'Learn to navigate and use the helpNINJA dashboard effectively',
        href: '/docs/dashboard',
        icon: 'fa-duotone fa-solid fa-chart-line',
        time: '10 min read'
    },
    {
        title: 'Set Up Integrations',
        description: 'Connect Slack, email, and other tools for seamless escalations',
        href: '/docs/integrations',
        icon: 'fa-duotone fa-solid fa-link',
        time: '8 min read'
    }
];

const allGuides = [
    {
        title: 'Getting Started',
        description: 'Complete onboarding guide for new helpNINJA users',
        href: '/docs',
        icon: 'fa-duotone fa-solid fa-rocket'
    },
    {
        title: 'Widget Installation',
        description: 'Step-by-step widget setup and customization',
        href: '/docs/widget-installation',
        icon: 'fa-duotone fa-solid fa-wrench'
    },
    {
        title: 'Dashboard Guide',
        description: 'Master the helpNINJA dashboard and analytics',
        href: '/docs/dashboard',
        icon: 'fa-duotone fa-solid fa-chart-line'
    },
    {
        title: 'Integrations',
        description: 'Connect your favorite tools and platforms',
        href: '/docs/integrations',
        icon: 'fa-duotone fa-solid fa-link'
    },
    {
        title: 'Billing & Plans',
        description: 'Manage subscriptions and understand plan features',
        href: '/docs/billing',
        icon: 'fa-duotone fa-solid fa-credit-card'
    },
    {
        title: 'Troubleshooting',
        description: 'Solutions for common issues and problems',
        href: '/docs/troubleshooting',
        icon: 'fa-duotone fa-solid fa-tools'
    }
];

export default function DocsHomePage() {
    return (
        <div className="not-prose">
            {/* Hero Section */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-base-content mb-4">
                    Welcome to the help<span className="text-primary">NINJA</span> Help Center
                </h1>
                <p className="text-xl text-base-content/70 max-w-3xl mx-auto">
                    Everything you need to know about setting up, configuring, and getting the most out of your
                    AI-powered customer support platform.
                </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-12">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search documentation..."
                        className="input input-bordered w-full pl-12 pr-4 py-3 text-lg"
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Quick Start Section */}
            <section className="mb-16">
                <h2 className="text-2xl font-bold text-base-content mb-6">Quick Start</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {quickStartCards.map((card) => (
                        <Link
                            key={card.href}
                            href={card.href}
                            className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer group"
                        >
                            <div className="card-body">
                                <div className="flex items-center justify-between mb-3">
                                    <i className={`${card.icon} text-3xl`}></i>
                                    <span className="text-sm text-base-content/60">{card.time}</span>
                                </div>
                                <h3 className="card-title text-lg group-hover:text-primary transition-colors">
                                    {card.title}
                                </h3>
                                <p className="text-base-content/70">{card.description}</p>
                                <div className="card-actions justify-end mt-4">
                                    <span className="text-primary text-sm font-medium group-hover:underline">
                                        Read guide →
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* All Guides Section */}
            <section className="mb-16">
                <h2 className="text-2xl font-bold text-base-content mb-6">All Documentation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {allGuides.map((guide) => (
                        <Link
                            key={guide.href}
                            href={guide.href}
                            className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer group"
                        >
                            <div className="card-body">
                                <div className="flex items-start space-x-4">
                                    <i className={`${guide.icon} text-2xl`}></i>
                                    <div className="flex-1">
                                        <h3 className="card-title text-lg group-hover:text-primary transition-colors">
                                            {guide.title}
                                        </h3>
                                        <p className="text-base-content/70 mt-2">{guide.description}</p>
                                    </div>
                                    <svg
                                        className="w-5 h-5 text-base-content/40 group-hover:text-primary transition-colors"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Popular Topics */}
            <section className="mb-16">
                <h2 className="text-2xl font-bold text-base-content mb-6">Popular Topics</h2>
                <div className="bg-base-200 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-semibold text-base-content mb-3">Getting Started</h3>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <Link href="/docs/widget-installation" className="text-primary hover:underline">
                                        How to install the chat widget
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/docs/dashboard" className="text-primary hover:underline">
                                        Understanding the dashboard
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/docs/integrations" className="text-primary hover:underline">
                                        Setting up Slack integration
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base-content mb-3">Advanced Features</h3>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <Link href="/docs/dashboard" className="text-primary hover:underline">
                                        Customizing AI responses
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/docs/integrations" className="text-primary hover:underline">
                                        Setting up escalation rules
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/docs/billing" className="text-primary hover:underline">
                                        Understanding usage limits
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Need Help CTA */}
            <section>
                <div className="bg-primary/10 rounded-lg p-8 text-center">
                    <h2 className="text-2xl font-bold text-base-content mb-4">
                        Still need help?
                    </h2>
                    <p className="text-base-content/70 mb-6 max-w-2xl mx-auto">
                        Can&apos;t find what you&apos;re looking for? Our support team is here to help you get the most out of helpNINJA.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="mailto:support@helpninja.app"
                            className="btn btn-primary"
                        >
                            <i className="fa-duotone fa-solid fa-envelope text-blue-500 mr-2"></i>Contact Support
                        </a>
                        <Link
                            href="/docs/troubleshooting"
                            className="btn btn-outline"
                        >
                            <i className="fa-duotone fa-solid fa-wrench text-orange-500 mr-2"></i>Troubleshooting
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}