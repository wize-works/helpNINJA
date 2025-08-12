import { getTenantIdServer } from "@/lib/auth";
import { query } from "@/lib/db";
import ChatWidgetPanel from "@/components/chat-widget-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";

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
    const tenantId = await getTenantIdServer({ allowEnvFallback: true })
    const t = await getTenant(tenantId)
    
    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Settings", icon: "fa-sliders" }
    ];
    
    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} />
            
            <h1 className="text-2xl font-bold">Settings</h1>

            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <h2 className="card-title">Tenant</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="opacity-60">ID</div>
                            <div className="font-mono break-all">{t.id}</div>
                        </div>
                        <div>
                            <div className="opacity-60">Name</div>
                            <div>{t.name}</div>
                        </div>
                        <div>
                            <div className="opacity-60">Plan</div>
                            <div>{t.plan} <span className="badge badge-outline ml-2">{t.plan_status}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {(t.public_key || t.secret_key) && (
                <div className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title">API keys</h2>
                            <RotateKeysButton tenantId={tenantId} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {t.public_key && (<div><div className="opacity-60">Public key</div><div className="font-mono break-all">{t.public_key}</div></div>)}
                            {t.secret_key && (<div><div className="opacity-60">Secret key</div><div className="font-mono break-all">{t.secret_key}</div></div>)}
                        </div>
                        {t.public_key && (
                            <div className="mt-6">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="font-semibold">Chat widget</h3>
                                    <div className="text-xs opacity-70">Preview + embed</div>
                                </div>
                                <ChatWidgetPanel tenantPublicKey={t.public_key} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function RotateKeysButton({ tenantId }: { tenantId: string }) {
    async function action() {
        'use server'
        await fetch(`${process.env.SITE_URL || ''}/api/tenants/${tenantId}/rotate-keys`, { method: 'POST', headers: { 'x-tenant-id': tenantId } })
    }
    return (<form action={action}><button className="btn btn-sm"><i className="fa-duotone fa-arrows-rotate mr-2" />Rotate keys</button></form>)
}
