import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild } from "@/components/ui/animated-page";

export const runtime = 'nodejs'

type Row = { id: string; name: string; plan: string; plan_status: string; public_key?: string | null; secret_key?: string | null }

async function getTenant(tenantId: string) {
    const { rows } = await query<Row>(
        `select id, name, plan, plan_status,
            (select column_name from information_schema.columns where table_schema='public' and table_name='tenants' and column_name='public_key') as has_public_key,
            (select column_name from information_schema.columns where table_schema='public' and table_name='tenants' and column_name='secret_key') as has_secret_key,
            public_key, secret_key
     from public.tenants where id=$1`,
        [tenantId]
    )
    return rows[0]
}

export default async function SettingsPage() {
    const tenantId = await getTenantIdStrict()
    const t = await getTenant(tenantId)

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Settings", icon: "fa-sliders" }
    ];

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Breadcrumb */}
                <StaggerContainer>
                    <StaggerChild>
                        <Breadcrumb items={breadcrumbItems} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Header */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-base-content">Account Settings</h1>
                                <p className="text-base-content/60 mt-2">
                                    Manage your account information, API keys, and chat widget configuration
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="stats shadow">
                                    <div className="stat">
                                        <div className="stat-figure text-primary">
                                            <i className="fa-duotone fa-solid fa-shield-check text-2xl" aria-hidden />
                                        </div>
                                        <div className="stat-title">Account Status</div>
                                        <div className="stat-value text-primary text-lg">{t.plan_status}</div>
                                        <div className="stat-desc">{t.plan} plan</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Account Information */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-user text-lg text-primary" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-base-content">Account Information</h2>
                                        <p className="text-base-content/60 text-sm">Your tenant details and subscription information</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <div className="text-sm text-base-content/60 mb-1">Tenant ID</div>
                                        <div className="font-mono text-sm text-base-content break-all">{t.id}</div>
                                    </div>
                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <div className="text-sm text-base-content/60 mb-1">Organization Name</div>
                                        <div className="text-base-content font-medium">{t.name}</div>
                                    </div>
                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <div className="text-sm text-base-content/60 mb-1">Current Plan</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base-content font-medium">{t.plan}</span>
                                            <span className="badge badge-primary badge-sm">{t.plan_status}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* API Keys Section */}
                {(t.public_key || t.secret_key) && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-2xl shadow-sm">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-warning/10 rounded-2xl flex items-center justify-center">
                                                <i className="fa-duotone fa-solid fa-key text-lg text-warning" aria-hidden />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-base-content">Widget Keys</h2>
                                                <p className="text-base-content/60 text-sm">Essential keys for chat widget integration on your website</p>
                                            </div>
                                        </div>
                                        <RotateKeysButton tenantId={tenantId} />
                                    </div>

                                    {/* Widget Keys Help */}
                                    <div className="alert alert-info mb-6">
                                        <i className="fa-duotone fa-solid fa-info-circle text-xl" aria-hidden />
                                        <div>
                                            <div className="font-semibold mb-1">Widget Integration Keys</div>
                                            <div className="text-sm opacity-90">
                                                These keys are specifically for embedding the helpNINJA chat widget on your website.
                                                Use the public key in your widget script - it&apos;s safe for client-side use. The secret key is for server-side authentication.
                                                <div className="mt-2">
                                                    <span className="font-medium">Need programmatic API access?</span> Visit the{' '}
                                                    <a href="/dashboard/settings/api" className="link link-primary">API Keys page</a> to create managed keys with specific permissions.
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        {t.public_key && (
                                            <div className="p-4 bg-base-200/20 rounded-xl">
                                                <div className="text-sm text-base-content/60 mb-2">Public Key (Widget)</div>
                                                <div className="font-mono text-sm text-base-content break-all bg-base-300/30 p-3 rounded-lg">
                                                    {t.public_key}
                                                </div>
                                                <div className="text-xs text-base-content/50 mt-2">
                                                    <i className="fa-duotone fa-solid fa-shield-check mr-1" aria-hidden />
                                                    Safe to use in client-side code and widget scripts
                                                </div>
                                            </div>
                                        )}
                                        {t.secret_key && (
                                            <div className="p-4 bg-base-200/20 rounded-xl">
                                                <div className="text-sm text-base-content/60 mb-2">Secret Key (Server)</div>
                                                <div className="font-mono text-sm text-base-content break-all bg-base-300/30 p-3 rounded-lg">
                                                    {t.secret_key}
                                                </div>
                                                <div className="text-xs text-warning mt-2">
                                                    <i className="fa-duotone fa-solid fa-exclamation-triangle mr-1" aria-hidden />
                                                    Keep this secure - server-side only, never expose in client code
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Widget Configuration Link */}
                                    {t.public_key && (
                                        <div className="flex items-center justify-between p-4 bg-base-200/20 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center">
                                                    <i className="fa-duotone fa-solid fa-comment text-info" aria-hidden />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-base-content">Chat Widget</h3>
                                                    <p className="text-base-content/60 text-sm">
                                                        Manage chat widget appearance, behavior, and integration
                                                    </p>
                                                </div>
                                            </div>
                                            <a href="/dashboard/widget" className="btn btn-primary rounded-xl">
                                                <i className="fa-duotone fa-solid fa-gear mr-2" aria-hidden />
                                                Manage Widget
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Team Management Section */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-users text-lg text-secondary" aria-hidden />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-base-content">Team Management</h2>
                                            <p className="text-base-content/60 text-sm">Manage your team members and their access levels</p>
                                        </div>
                                    </div>
                                    <a href="/dashboard/team" className="btn btn-outline btn-sm rounded-lg">
                                        <i className="fa-duotone fa-solid fa-users-gear mr-2" aria-hidden />
                                        Manage Team
                                    </a>
                                </div>

                                <div className="alert alert-info mb-4">
                                    <i className="fa-duotone fa-solid fa-info-circle text-xl" aria-hidden />
                                    <div>
                                        <div className="font-medium">Team Collaboration</div>
                                        <div className="text-sm opacity-90">
                                            Add team members with different access levels to collaborate on your helpNINJA setup.
                                            Visit the Team page to invite new members and manage existing ones.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Billing/Subscription Section */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-credit-card text-lg text-success" aria-hidden />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-base-content">Billing & Subscription</h2>
                                            <p className="text-base-content/60 text-sm">Manage your subscription, payment methods, and usage</p>
                                        </div>
                                    </div>
                                    <a href="/dashboard/billing" className="btn btn-outline btn-sm rounded-lg">
                                        <i className="fa-duotone fa-solid fa-file-invoice-dollar mr-2" aria-hidden />
                                        Manage Billing
                                    </a>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <div className="text-sm text-base-content/60 mb-2">Current Plan</div>
                                        <div className="text-xl font-bold text-base-content">{t.plan}</div>
                                        <div className="badge badge-success mt-1">{t.plan_status}</div>
                                    </div>
                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <div className="text-sm text-base-content/60 mb-2">Billing Period</div>
                                        <div className="text-base font-medium">Monthly</div>
                                        <div className="text-sm text-base-content/60 mt-1">Auto-renews</div>
                                    </div>
                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <div className="text-sm text-base-content/60 mb-2">Next Invoice</div>
                                        <a href="/dashboard/billing" className="btn btn-sm btn-primary rounded-lg mt-1">
                                            View Billing Details
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    )
}

function RotateKeysButton({ tenantId }: { tenantId: string }) {
    async function action() {
        'use server'
        await fetch(`${process.env.SITE_URL || ''}/api/tenants/${tenantId}/rotate-keys`, { method: 'POST' })
    }
    return (
        <form action={action}>
            <button className="btn btn-outline btn-sm rounded-lg">
                <i className="fa-duotone fa-solid fa-arrows-rotate mr-2" aria-hidden />
                Rotate Keys
            </button>
        </form>
    )
}
