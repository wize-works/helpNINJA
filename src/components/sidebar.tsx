"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTenant } from "./tenant-context";

const primaryNav = [
    { href: "/dashboard", icon: "fa-gauge-high", label: "Overview" },
    { href: "/dashboard/billing", icon: "fa-credit-card", label: "Billing" },
];
const secondaryNav = [
    { href: "/dashboard/documents", icon: "fa-file-lines", label: "Documents" },
    { href: "/dashboard/conversations", icon: "fa-messages", label: "Conversations" },
    { href: "/dashboard/integrations", icon: "fa-puzzle-piece", label: "Integrations" },
    { href: "/dashboard/settings", icon: "fa-sliders", label: "Settings" },
];

type Usage = { used: number; limit: number; plan: string } | null;

export default function Sidebar() {
    const pathname = usePathname();
    const { tenantId } = useTenant();
    const [usage, setUsage] = useState<Usage>(null);
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!tenantId) return;
            try {
                const res = await fetch(`/api/usage`, { headers: { 'x-tenant-id': tenantId } });
                if (!res.ok) throw new Error('bad');
                const data = await res.json();
                if (!cancelled) { setUsage({ used: data.used, limit: data.limit, plan: data.plan }); setOffline(false); }
            } catch {
                if (!cancelled) { setOffline(true); }
            }
        }
        load();
        return () => { cancelled = true; };
    }, [tenantId]);
    return (
        <aside className="h-[calc(100vh-4rem)] sticky top-16 w-64 bg-base-200/60 border-r border-base-300 backdrop-blur">
            <div className="h-full flex flex-col px-3 py-4">
                <nav className="flex flex-col gap-1">
                    <p className="px-3 py-2 text-xs uppercase tracking-wide text-base-content/60">Overview</p>
                    {primaryNav.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`btn btn-ghost justify-start font-medium gap-3 ${pathname === item.href ? "bg-base-100 text-primary border border-base-300" : ""
                                }`}
                        >
                            <i className={`fa-duotone fa-solid ${item.icon} text-base`} aria-hidden />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="my-3 border-t border-base-300" />
                <nav className="flex flex-col gap-1">
                    <p className="px-3 py-2 text-xs uppercase tracking-wide text-base-content/60">Manage</p>
                    {secondaryNav.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`btn btn-ghost justify-start font-medium gap-3 ${pathname === item.href ? "bg-base-100 text-primary border border-base-300" : ""
                                }`}
                        >
                            <i className={`fa-duotone fa-solid ${item.icon} text-base`} aria-hidden />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="flex-1" />
                <div className="px-2">
                    {offline && (
                        <div className="alert alert-warning mb-2 text-sm">
                            <i className="fa-duotone fa-triangle-exclamation" aria-hidden />
                            <span>DB offline; showing static usage.</span>
                        </div>
                    )}
                    <div className="card bg-base-100 border border-base-300">
                        <div className="card-body p-3">
                            <p className="text-sm">Usage this month {usage?.plan ? `(${usage.plan})` : ''}</p>
                            <progress className="progress progress-primary w-full" value={usage ? Math.min(usage.used, usage.limit) : 45} max={usage ? usage.limit : 100}></progress>
                            <p className="text-xs text-base-content/70 mt-1">
                                {usage ? `${usage.used} / ${usage.limit} messages` : '45 / 100 messages'}
                            </p>
                            <button className="btn btn-primary btn-sm mt-2">
                                <i className="fa-duotone fa-solid fa-arrow-up-right-from-square mr-2" aria-hidden />
                                Upgrade
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}