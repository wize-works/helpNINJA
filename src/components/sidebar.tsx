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

// Main navigation sections with improved information architecture
// Order reflects onboarding -> operations -> optimization -> admin
const navigationSections: NavSection[] = [
    { id: "dashboard", label: "Dashboard", icon: "fa-gauge-high", href: "/dashboard", collapsible: false },
    {
        id: "knowledge",
        label: "Knowledge",
        icon: "fa-book",
        collapsible: true,
        defaultOpen: true,
        items: [
            { href: "/dashboard/sites", label: "Sites", badge: null },
            { href: "/dashboard/sources", label: "Sources", badge: null },
            { href: "/dashboard/documents", label: "Documents", badge: null },
            { href: "/dashboard/answers", label: "Answers", badge: null },
            { href: "/dashboard/widget", label: "Widget Settings", badge: null },
        ]
    },
    { id: "conversations", label: "Conversations", icon: "fa-comments", href: "/dashboard/conversations", collapsible: false },
    { id: "feedback", label: "User Feedback", icon: "fa-comment-dots", href: "/dashboard/feedback", collapsible: false },
    {
        id: "automation",
        label: "Automation",
        icon: "fa-gears",
        collapsible: true,
        defaultOpen: false,
        items: [
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
            { href: "/dashboard/integrations", label: "Installed", badge: 2 },
            { href: "/dashboard/integrations/marketplace", label: "Marketplace", badge: null },
        ]
    },
    { id: "analytics", label: "Analytics", icon: "fa-chart-line", href: "/dashboard/analytics", collapsible: false },
    { id: "events", label: "Events", icon: "fa-waveform-lines", href: "/dashboard/events", collapsible: false },
    { id: "playground", label: "Playground", icon: "fa-flask", href: "/dashboard/playground", collapsible: false },
    { id: "team", label: "Team & Access", icon: "fa-users", href: "/dashboard/team", collapsible: false },
    { id: "developers", label: "Developers", icon: "fa-code", href: "/dashboard/settings/api", collapsible: false }
];

export default function Sidebar() {
    const pathname = usePathname();
    const { usage, usageLoading, usageOffline } = useTenant();
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const LS_KEY = 'sidebarCollapsedSections';

    useEffect(() => {
        // Initialize collapsed state from localStorage or default settings
        try {
            const stored = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
            if (stored) {
                const parsed = JSON.parse(stored) as Record<string, boolean>;
                // Ensure any newly added sections get defaults
                navigationSections.forEach(section => {
                    if (section.collapsible && !(section.id in parsed)) {
                        parsed[section.id] = !section.defaultOpen;
                    }
                });
                setCollapsedSections(parsed);
                return;
            }
        } catch { /* ignore */ }
        const initial: Record<string, boolean> = {};
        navigationSections.forEach(section => {
            if (section.collapsible) initial[section.id] = !section.defaultOpen;
        });
        setCollapsedSections(initial);
    }, []);

    const toggleSection = (sectionId: string) => {
        setCollapsedSections(prev => {
            const next = { ...prev, [sectionId]: !prev[sectionId] };
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    };

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname.startsWith(href);
    };

    const usageLimit = usage?.limit ?? 0;
    const usageUsed = usage?.used ?? 0;
    const usagePercent = usageLimit > 0 ? Math.min(100, (usageUsed / usageLimit) * 100) : 0;
    const planLabel = usage?.plan ? usage.plan : 'Starter';

    return (
        <aside className="h-[calc(100vh-4rem)] sticky w-64 bg-base-100/60 backdrop-blur-sm border-r border-base-200/60">
            <div className="h-full flex flex-col">
                {/* Main Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1">
                    {navigationSections.map((section, index) => {
                        // Add visual dividers between conceptual tiers
                        return (
                            <SlideIn key={section.id} delay={index * 0.05}>
                                {/* Section Header / Main Item */}
                                {section.collapsible ? (
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-base-content/80 hover:text-base-content hover:bg-base-200/60 transition-colors duration-150 group"
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
                                            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${isActive(section.href)
                                                ? "bg-base-200 text-base-content border border-base-300/60"
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
                                    <div className="ml-5 mt-1 mb-2 space-y-0.5">
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
                        )
                    })}
                </nav>

                {/* Usage Statistics Card */}
                <div className="p-3 border-t border-base-200/60">
                    <SlideIn delay={0.3}>
                        {usageOffline && (
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
                                    {planLabel.replace(/^./, c => c.toUpperCase())}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {usageLoading ? (
                                    <div className="space-y-2 animate-pulse" aria-label="Loading usage metrics">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-base-content/40">User messages<br /><span className="text-xs">(UTC month)</span></span>
                                            <span className="h-4 w-14 rounded bg-base-300/60" />
                                        </div>
                                        <div className="w-full bg-base-300/40 rounded-full h-2 overflow-hidden">
                                            <div className="h-2 w-1/3 bg-gradient-to-r from-base-300 via-base-100 to-base-300 animate-[pulse_1.2s_ease-in-out_infinite]" />
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-base-content/40">
                                            <span>This month</span>
                                            <span className="h-3 w-10 rounded bg-base-300/60" />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-base-content/70">User messages<br /><span className="text-xs">(UTC month)</span></span>
                                            <span className="font-medium">
                                                {usage ? `${usageUsed} / ${usageLimit}` : usageOffline ? '—' : '0 / 0'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-base-300/60 rounded-full h-2" title={`Resets ${new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString().slice(0, 10)}`}>
                                            <div
                                                className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${usagePercent}%`
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-base-content/60">
                                            <span>This month</span>
                                            <span>
                                                {usage ? `${Math.round(usagePercent)}%` : usageOffline ? '—' : '0%'} used
                                            </span>
                                        </div>
                                    </>
                                )}
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