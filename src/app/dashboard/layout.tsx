import Sidebar from "@/components/sidebar";
import { TenantProvider } from "@/components/tenant-context";
import { SidebarBadgeProvider } from "@/components/sidebar-badge-context";
import { getTenantIdStrict } from "@/lib/tenant-resolve";
import AuthDebugPanel from "@/components/debug/auth";
import { Suspense } from "react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const tenantId = await getTenantIdStrict();
    return (
        <div className="min-h-[calc(100vh-4rem)]">{/* 4rem = titlebar height */}
            <TenantProvider tenantId={tenantId}>
                <SidebarBadgeProvider>
                    <div className="drawer lg:drawer-open">
                        <input id="hn-drawer" type="checkbox" className="drawer-toggle" />
                        <div className="drawer-content">
                            <section className="p-4 sm:p-6 lg:p-8 bg-base-300 min-h-[calc(100vh-4rem)]">
                                <div className="max-w-7xl mx-auto">{children}</div>
                            </section>
                        </div>
                        <div className="drawer-side z-40">
                            <label htmlFor="hn-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
                            <Sidebar />
                        </div>
                    </div>
                    <Suspense fallback={null}>
                        <AuthDebugPanel />
                    </Suspense>
                </SidebarBadgeProvider>
            </TenantProvider>
        </div>
    );
}