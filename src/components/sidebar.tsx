"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTenant } from "./tenant-context";
import { HoverScale, SlideIn } from "./ui/animated-page";

// Types for navigation structure
type NavItem = {
    href: string;
    label: string;
    badge?: number | null;
    disabled?: boolean;
};

type NavSectionBase = {
    id: string;
    label: string;
    icon: string;
};

type NavSectionLink = NavSectionBase & {
    collapsible: false;
    href: string;
};

type NavSectionCollapsible = NavSectionBase & {
    collapsible: true;
    defaultOpen?: boolean;
    items: NavItem[];
};

type NavSection = NavSectionLink | NavSectionCollapsible;

// Main navigation sections with collapsible functionality
const navigationSections: NavSection[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: "fa-gauge-high",
        href: "/dashboard",
        collapsible: false
    },
    {
        id: "sites",
        label: "Sites",
        icon: "fa-globe",
        collapsible: true,
        defaultOpen: true,
        items: [
            { href: "/dashboard/sites", label: "Manage Sites", badge: null },
            { href: "/dashboard/sources", label: "Sources", badge: null },
            { href: "/dashboard/documents", label: "Documents", badge: null },
            { href: "/dashboard/answers", label: "Answers", badge: null },
        ]
    },
    {
        id: "conversations",
        label: "Conversations",
        icon: "fa-comments",
        collapsible: true,
        defaultOpen: false,
        items: [
            { href: "/dashboard/conversations", label: "All Conversations", badge: null },
            { href: "/dashboard/rules", label: "Escalation Rules", badge: null },
            { href: "/dashboard/outbox", label: "Delivery Status", badge: null },
        ]
    },
    {
        id: "integrations",
        label: "Integrations",
        icon: "fa-plug",
        collapsible: true,
        defaultOpen: false,
        items: [
            { href: "/dashboard/integrations", label: "Dashboard", badge: 2 },
            { href: "/dashboard/integrations/marketplace", label: "Marketplace", badge: null },
            { href: "/dashboard/settings/api", label: "API Keys", badge: null },
        ]
    },
    {
        id: "analytics",
        label: "Analytics",
        icon: "fa-chart-line",
        href: "/dashboard/analytics",
        collapsible: false
    },
    {
        id: "tools",
        label: "Tools",
        icon: "fa-wrench",
        collapsible: true,
        defaultOpen: false,
        items: [
            { href: "/dashboard/playground", label: "Playground", badge: null },
            { href: "/dashboard/team", label: "Team", badge: null },
            { href: "/onboarding", label: "Setup Guide", badge: null },
        ]
    },
    {
        id: "settings",
        label: "Settings",
        icon: "fa-sliders",
        collapsible: true,
        defaultOpen: false,
        items: [
            { href: "/dashboard/settings", label: "General", badge: null },
        ]
    },
    {
        id: "billing",
        label: "Billing",
        icon: "fa-credit-card",
        href: "/dashboard/billing",
        collapsible: false
    }
];

type Usage = { used: number; limit: number; plan: string } | null;

export default function Sidebar() {
    const pathname = usePathname();
    const { tenantId } = useTenant();
    const [usage, setUsage] = useState<Usage>(null);
    const [offline, setOffline] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Initialize collapsed state based on default settings
        const initialCollapsed: Record<string, boolean> = {};
        navigationSections.forEach(section => {
            if (section.collapsible) {
                initialCollapsed[section.id] = !section.defaultOpen;
            }
        });
        setCollapsedSections(initialCollapsed);
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!tenantId) return;
            try {
                const res = await fetch(`/api/usage`);
                if (!res.ok) throw new Error('bad');
                const data = await res.json();
                if (!cancelled) {
                    setUsage({ used: data.used, limit: data.limit, plan: data.plan });
                    setOffline(false);
                }
            } catch {
                if (!cancelled) { setOffline(true); }
            }
        }
        load();
        return () => { cancelled = true; };
    }, [tenantId]);

    const toggleSection = (sectionId: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname.startsWith(href);
    };

    return (
        <aside className="h-[calc(100vh-4rem)] sticky w-64 bg-base-100/60 backdrop-blur-sm border-r border-base-200/60">
            <div className="h-full flex flex-col">
                {/* Main Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1">
                    {navigationSections.map((section, index) => (
                        <SlideIn key={section.id} delay={index * 0.05} className="space-y-1">
                            {/* Section Header / Main Item */}
                            {section.collapsible ? (
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-base-content/80 hover:text-base-content hover:bg-base-200/60 transition-all duration-200 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <i className={`fa-duotone fa-solid ${section.icon} text-base opacity-70 group-hover:opacity-100`} aria-hidden />
                                        <span>{section.label}</span>
                                    </div>
                                    <i
                                        className={`fa-duotone fa-solid fa-chevron-down text-xs opacity-50 transition-transform duration-200 ${collapsedSections[section.id] ? '-rotate-90' : ''
                                            }`}
                                        aria-hidden
                                    />
                                </button>
                            ) : (
                                <HoverScale scale={1.01}>
                                    <Link
                                        href={section.href}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(section.href)
                                            ? "bg-base-200 text-base-content shadow-sm border border-base-300/60"
                                            : "text-base-content/80 hover:text-base-content hover:bg-base-200/60"
                                            }`}
                                    >
                                        <i className={`fa-duotone fa-solid ${section.icon} text-base ${isActive(section.href) ? "opacity-100" : "opacity-70"
                                            }`} aria-hidden />
                                        <span>{section.label}</span>
                                    </Link>
                                </HoverScale>
                            )}

                            {/* Collapsible Items */}
                            {section.collapsible && section.items && !collapsedSections[section.id] && (
                                <div className="ml-6 space-y-1">
                                    {section.items.map((item, itemIndex) => (
                                        <SlideIn key={item.href} delay={(index * 0.05) + (itemIndex * 0.02)}>
                                            <HoverScale scale={item.disabled ? 1 : 1.01}>
                                                {item.disabled ? (
                                                    <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-base-content/40 cursor-not-allowed">
                                                        <span>{item.label}</span>
                                                        <span className="text-xs bg-base-300/50 text-base-content/50 px-2 py-0.5 rounded">
                                                            Coming Soon
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Link
                                                        href={item.href}
                                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive(item.href)
                                                            ? "bg-primary/10 text-primary font-medium shadow-sm"
                                                            : "text-base-content/70 hover:text-base-content hover:bg-base-200/60"
                                                            }`}
                                                    >
                                                        <span>{item.label}</span>
                                                        {item.badge && (
                                                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-accent text-accent-content rounded-full">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </Link>
                                                )}
                                            </HoverScale>
                                        </SlideIn>
                                    ))}
                                </div>
                            )}
                        </SlideIn>
                    ))}
                </nav>

                {/* Usage Statistics Card */}
                <div className="p-3 border-t border-base-200/60">
                    <SlideIn delay={0.3}>
                        {offline && (
                            <div className="mb-3 p-2 bg-warning/10 text-warning rounded-lg text-xs flex items-center gap-2">
                                <i className="fa-duotone fa-solid fa-triangle-exclamation" aria-hidden />
                                <span>Offline mode</span>
                            </div>
                        )}

                        <div className="bg-gradient-to-br from-base-200/40 to-base-300/40 rounded-xl p-4 border border-base-200/60">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-chart-bar text-xs text-primary" aria-hidden />
                                    </div>
                                    <span className="text-sm font-medium">Usage</span>
                                </div>
                                <span className="text-xs text-base-content/60 bg-base-100/60 px-2 py-1 rounded-md">
                                    {usage?.plan || 'Starter'}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-base-content/70">User messages<br /><span className="text-xs">(UTC month)</span></span>
                                    <span className="font-medium">
                                        {usage ? usage.used : 45} / {usage ? usage.limit : 100}
                                    </span>
                                </div>
                                <div className="w-full bg-base-300/60 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${usage ? Math.min(100, (usage.used / usage.limit) * 100) : 45}%`
                                        }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-xs text-base-content/60">
                                    <span>This month</span>
                                    <span>
                                        {usage ? `${Math.round(Math.min(100, (usage.used / usage.limit) * 100))}%` : '45%'} used
                                    </span>
                                </div>
                            </div>

                            <HoverScale scale={1.02}>
                                <Link
                                    href="/dashboard/billing"
                                    className="mt-3 w-full btn btn-primary btn-sm rounded-lg bg-gradient-to-r from-primary to-secondary border-none text-primary-content shadow-lg hover:shadow-xl transition-all duration-200"
                                >
                                    <i className="fa-duotone fa-solid fa-arrow-up-right-from-square mr-2" aria-hidden />
                                    Upgrade Plan
                                </Link>
                            </HoverScale>
                        </div>
                    </SlideIn>
                </div>
            </div>
        </aside>
    );
}