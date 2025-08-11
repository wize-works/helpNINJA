"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type Item = {
    href: string;
    label: string;
    emoji: string;
};

const NAV: Item[] = [
    {
        href: "/",
        label: "Home",
        emoji: "🏠"
    },
    {
        href: "/dashboard/billing",
        label: "Billing",
        emoji: "💳"
    },
    {
        href: "/dashboard/integrations",
        label: "Integrations",
        emoji: "🧩"
    },
    {
        href: "/dashboard/conversations",
        label: "Conversations",
        emoji: "💬"
    },
    {
        href: "/dashboard/sources",
        label: "Sources",
        emoji: "🗂️"
    },
    {
        href: "/dashboard/analytics",
        label: "Analytics",
        emoji: "📈"
    },
    {
        href: "/dashboard/settings",
        label: "Settings",
        emoji: "⚙️"
    },
];

function NavLink({ item, active }: { item: Item; active: boolean }) {
    return (
        <Link
            href={item.href}
            className={[
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100",
            ].join(" ")}
        >
            <span aria-hidden>{item.emoji}</span>
            <span>{item.label}</span>
        </Link>
    );
}

export default function DashboardNav() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // close mobile menu on route change
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
            {/* Top bar */}
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
                {/* Brand */}
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <img src="/logo.svg" alt="HelpNinja" className="h-6 w-6" />
                    <span>HelpNinja</span>
                </Link>

                {/* Org / Plan badge (placeholder) */}
                <div className="ml-3 hidden items-center gap-2 rounded-full border px-2 py-1 text-xs text-gray-600 md:flex">
                    <span className="font-medium">Demo Tenant</span>
                    <span className="h-4 w-px bg-gray-300" />
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        Pro
                    </span>
                </div>

                {/* Spacer */}
                <div className="ml-auto" />

                {/* Right actions (optional slot for ThemeToggle) */}
                {/* <ThemeToggle /> */}

                {/* Mobile menu button */}
                <button
                    className="ml-2 rounded-md border px-3 py-1.5 text-sm md:hidden"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Toggle navigation"
                >
                    {open ? "Close ✖" : "Menu ☰"}
                </button>
            </div>

            {/* Nav rail */}
            <nav className="mx-auto max-w-6xl px-4 pb-3 md:pb-4">
                {/* Desktop nav */}
                <div className="hidden grid-cols-8 gap-2 md:grid">
                    {NAV.map((item) => {
                        const active =
                            item.href === "/"
                                ? pathname === "/" || pathname === "/(dashboard)"
                                : pathname.startsWith(item.href);
                        return <NavLink key={item.href} item={item} active={active} />;
                    })}
                </div>

                {/* Mobile dropdown */}
                {open && (
                    <div className="grid gap-2 pb-3 md:hidden">
                        {NAV.map((item) => {
                            const active =
                                item.href === "/"
                                    ? pathname === "/" || pathname === "/(dashboard)"
                                    : pathname.startsWith(item.href);
                            return <NavLink key={item.href} item={item} active={active} />;
                        })}
                    </div>
                )}
            </nav>
        </header>
    );
}
