"use client";

import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import NotificationsBell from "./notifications-bell";
import { usePathname } from "next/navigation";
import Logo from "./logo";
import { HoverScale, SlideIn } from "./ui/animated-page";
import { SignOutButton, useUser } from "@clerk/nextjs";
import React from "react";

export default function Titlebar() {
    const pathname = usePathname();
    const { isLoaded, user } = useUser();
    const [plan, setPlan] = React.useState<string | null>(null);

    React.useEffect(() => {
        let aborted = false;
        // Best-effort: fetch current plan; server will resolve tenant or fall back in dev
        fetch('/api/usage')
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (!aborted && d?.plan) setPlan(String(d.plan)); })
            .catch(() => { });
        return () => { aborted = true; };
    }, []);

    const displayName = React.useMemo(() => {
        if (!isLoaded || !user) return "";
        const n = [user.firstName, user.lastName].filter(Boolean).join(" ");
        return n || user.username || user.primaryEmailAddress?.emailAddress || "";
    }, [isLoaded, user]);

    const displayEmail = user?.primaryEmailAddress?.emailAddress || "";
    const avatarUrl = user?.imageUrl || "";
    const initials = React.useMemo(() => {
        if (displayName) {
            const parts = displayName.trim().split(/\s+/).slice(0, 2);
            return parts.map(p => p.charAt(0).toUpperCase()).join("") || "?";
        }
        if (displayEmail) return displayEmail.charAt(0).toUpperCase();
        return "?";
    }, [displayName, displayEmail]);
    const planLabel = (plan || "starter").replace(/^./, c => c.toUpperCase()) + " Plan";
    return (
        <header className="sticky top-0 z-50 bg-base-100/60 backdrop-blur-sm border-b border-base-200/60">
            <div className="w-full px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Brand + Mobile Menu */}
                    <div className="flex items-center gap-3">
                        {/* Mobile sidebar toggle */}
                        <HoverScale className="lg:hidden" scale={1.05}>
                            <label
                                htmlFor="hn-drawer"
                                className="w-9 h-9 rounded-lg bg-base-200/60 hover:bg-base-200 border border-base-300/40 flex items-center justify-center transition-all duration-200"
                                aria-label="Open navigation menu"
                            >
                                <i className="fa-duotone fa-solid fa-bars text-sm text-base-content/80" aria-hidden />
                            </label>
                        </HoverScale>

                        {/* Brand */}
                        <SlideIn direction="right" delay={0.1}>
                            <HoverScale scale={1.01}>
                                <Link href="/" className="flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-base-200/40 transition-all duration-200 group">
                                    <div className="relative">
                                        <Logo
                                            width={200}
                                            height={34}
                                            className="text-primary group-hover:text-primary transition-all duration-200 group-hover:scale-110"
                                        />
                                    </div>
                                </Link>
                            </HoverScale>
                        </SlideIn>
                    </div>

                    {/* Center: Global Search */}
                    <div className="flex-1 max-w-xl mx-8 hidden md:block">
                        <SlideIn delay={0.2}>
                            <HoverScale scale={1.01}>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <i className="fa-duotone fa-solid fa-magnifying-glass text-sm text-base-content/40 group-hover:text-base-content/60 transition-colors" aria-hidden />
                                    </div>
                                    <input
                                        type="search"
                                        placeholder="Search conversations, documents..."
                                        className="w-full h-10 pl-10 pr-16 bg-base-200/40 border border-base-300/40 rounded-xl text-sm placeholder:text-base-content/40 focus:bg-base-100/80 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                        aria-label="Global search"
                                    />
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <div className="flex items-center gap-1">
                                            <kbd className="kbd kbd-xs bg-base-300/60 text-base-content/50 border border-base-300/60">⌘</kbd>
                                            <kbd className="kbd kbd-xs bg-base-300/60 text-base-content/50 border border-base-300/60">K</kbd>
                                        </div>
                                    </div>
                                </div>
                            </HoverScale>
                        </SlideIn>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <SlideIn direction="left" delay={0.3}>
                            <div className="flex items-center gap-1">
                                {/* Quick Create */}
                                <div className="dropdown dropdown-end">
                                    <HoverScale scale={1.05}>
                                        <div
                                            tabIndex={0}
                                            role="button"
                                            className="w-9 h-9 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center transition-all duration-200 group cursor-pointer"
                                            aria-label="Quick create"
                                            title="Quick create"
                                        >
                                            <i className="fa-duotone fa-solid fa-plus text-sm text-primary group-hover:text-primary/80" aria-hidden />
                                        </div>
                                    </HoverScale>
                                    <ul
                                        tabIndex={0}
                                        className="dropdown-content menu bg-base-100/95 backdrop-blur-sm rounded-2xl shadow-xl border border-base-200/60 w-56 p-2 mt-2"
                                    >
                                        <li className="menu-title text-xs font-semibold text-base-content/50 px-3 py-2 uppercase tracking-wide">
                                            Quick Create
                                        </li>
                                        <li>
                                            <Link href="/dashboard/answers" className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-base-200/60 transition-colors">
                                                <i className="fa-duotone fa-solid fa-message-question text-base text-primary" aria-hidden />
                                                <div>
                                                    <div className="font-medium">New Answer</div>
                                                    <div className="text-xs text-base-content/50">Create curated response</div>
                                                </div>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/dashboard/sites" className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-base-200/60 transition-colors">
                                                <i className="fa-duotone fa-solid fa-globe text-base text-success" aria-hidden />
                                                <div>
                                                    <div className="font-medium">New Site</div>
                                                    <div className="text-xs text-base-content/50">Register domain</div>
                                                </div>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/dashboard/sources" className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-base-200/60 transition-colors">
                                                <i className="fa-duotone fa-solid fa-upload text-base text-info" aria-hidden />
                                                <div>
                                                    <div className="font-medium">Add Source</div>
                                                    <div className="text-xs text-base-content/50">Upload content</div>
                                                </div>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/dashboard/rules" className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-base-200/60 transition-colors">
                                                <i className="fa-duotone fa-solid fa-route text-base text-warning" aria-hidden />
                                                <div>
                                                    <div className="font-medium">New Rule</div>
                                                    <div className="text-xs text-base-content/50">Setup escalation</div>
                                                </div>
                                            </Link>
                                        </li>
                                    </ul>
                                </div>

                                {/* Notifications */}
                                {!(pathname?.startsWith('/auth')) && <NotificationsBell />}

                                {/* Help */}
                                <HoverScale scale={1.05}>
                                    <button
                                        className="hidden sm:flex w-9 h-9 rounded-lg bg-base-200/60 hover:bg-base-200 border border-base-300/40 items-center justify-center transition-all duration-200 group"
                                        aria-label="Help & Support"
                                        title="Help & Support"
                                    >
                                        <i className="fa-duotone fa-solid fa-circle-question text-sm text-base-content/70 group-hover:text-base-content" aria-hidden />
                                    </button>
                                </HoverScale>

                                {/* Theme Toggle */}
                                <div className="ml-1">
                                    <ThemeToggle />
                                </div>

                                {/* User Menu */}
                                <div className="dropdown dropdown-end ml-2">
                                    <HoverScale scale={1.02}>
                                        <div
                                            tabIndex={0}
                                            role="button"
                                            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-base-200/40 hover:bg-base-200/60 border border-base-300/40 transition-all duration-200 group"
                                            aria-label="User menu"
                                        >
                                            <div className="avatar">
                                                {avatarUrl ? (
                                                    <div className="w-7 h-7 rounded-lg overflow-hidden shadow-sm">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={avatarUrl} alt={displayName || "User avatar"} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="bg-gradient-to-br from-primary to-secondary text-primary-content w-7 h-7 rounded-lg flex items-center justify-center shadow-sm">
                                                        <span className="text-xs font-semibold">{initials}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="hidden sm:block text-left">
                                                <div className="text-sm font-medium text-base-content">{displayName || ""}</div>
                                                <div className="text-xs text-base-content/50 -mt-0.5">{planLabel}</div>
                                            </div>
                                            <i className="fa-duotone fa-solid fa-chevron-down text-xs text-base-content/50 group-hover:text-base-content/70 transition-colors" aria-hidden />
                                        </div>
                                    </HoverScale>
                                    <ul
                                        tabIndex={0}
                                        className="dropdown-content menu bg-base-100/95 backdrop-blur-sm rounded-2xl shadow-xl border border-base-200/60 w-72 p-3 mt-2"
                                    >
                                        {/* User Info Header */}
                                        <li className="mb-2">
                                            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
                                                <div className="avatar">
                                                    {avatarUrl ? (
                                                        <div className="w-10 h-10 rounded-xl overflow-hidden">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={avatarUrl} alt={displayName || "User avatar"} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gradient-to-br from-primary to-secondary text-primary-content w-10 h-10 rounded-xl flex items-center justify-center">
                                                            <span className="text-sm font-semibold">{initials}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-base-content">{displayName || ""}</div>
                                                    <div className="text-sm text-base-content/60">{displayEmail}</div>
                                                    <div className="text-xs text-primary font-medium">{planLabel}</div>
                                                </div>
                                            </div>
                                        </li>

                                        {/* Account Section */}
                                        <li className="menu-title text-xs font-semibold text-base-content/50 px-3 py-2 uppercase tracking-wide">
                                            Account
                                        </li>
                                        <li>
                                            <Link href="/dashboard/account" className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-base-200/60 transition-colors">
                                                <i className="fa-duotone fa-solid fa-user text-base text-base-content/60" aria-hidden />
                                                <div>
                                                    <div className="font-medium">Profile Settings</div>
                                                    <div className="text-xs text-base-content/50">Manage your account</div>
                                                </div>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/dashboard/billing" className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-base-200/60 transition-colors">
                                                <i className="fa-duotone fa-solid fa-credit-card text-base text-base-content/60" aria-hidden />
                                                <div>
                                                    <div className="font-medium">Billing & Plans</div>
                                                    <div className="text-xs text-base-content/50">Upgrade or manage subscription</div>
                                                </div>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/dashboard/settings" className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-base-200/60 transition-colors">
                                                <i className="fa-duotone fa-solid fa-sliders text-base text-base-content/60" aria-hidden />
                                                <div>
                                                    <div className="font-medium">Preferences</div>
                                                    <div className="text-xs text-base-content/50">Customize your experience</div>
                                                </div>
                                            </Link>
                                        </li>

                                        <div className="divider my-2"></div>

                                        {/* Resources Section */}
                                        <li className="menu-title text-xs font-semibold text-base-content/50 px-3 py-2 uppercase tracking-wide">
                                            Resources
                                        </li>
                                        <li>
                                            <a href="/docs" className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-base-200/60 transition-colors">
                                                <i className="fa-duotone fa-solid fa-book-open text-base text-base-content/60" aria-hidden />
                                                <span>Documentation</span>
                                            </a>
                                        </li>
                                        <li>
                                            <a href="/support" className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-base-200/60 transition-colors">
                                                <i className="fa-duotone fa-solid fa-headset text-base text-base-content/60" aria-hidden />
                                                <span>Get Support</span>
                                            </a>
                                        </li>

                                        <div className="divider my-2"></div>

                                        <li>
                                            <SignOutButton redirectUrl={"/"}>
                                                <button className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-error hover:bg-error/10 transition-colors w-full">
                                                    <i className="fa-duotone fa-solid fa-arrow-right-from-bracket text-base" aria-hidden />
                                                    <span>Sign Out</span>
                                                </button>
                                            </SignOutButton>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </SlideIn>
                    </div>
                </div>
            </div>
        </header>
    );
}