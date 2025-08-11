import { getTenantIdServer } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = 'nodejs'

type Row = { id: string; provider: 'email' | 'slack' | string; name: string; status: string }

async function list(tenantId: string) {
    const { rows } = await query<Row>(`select id, provider, name, status from public.integrations where tenant_id=$1 order by created_at desc`, [tenantId])
    return rows
}

export default async function IntegrationsPage() {
    const tenantId = await getTenantIdServer({ allowEnvFallback: true })
    const rows = await list(tenantId)
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Integrations</h1>
                <CreateForm tenantId={tenantId} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rows.map(r => (
                    <div key={r.id} className="card bg-base-100 border border-base-300">
                        <div className="card-body">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <i className={`fa-duotone fa-solid ${icon(r.provider)} text-xl`} aria-hidden />
                                    <div>
                                        <div className="font-medium">{r.name}</div>
                                        <div className="text-xs opacity-60">{r.provider}</div>
                                    </div>
                                </div>
                                <span className={`badge ${r.status === 'active' ? 'badge-success' : ''}`}>{r.status}</span>
                            </div>
                            <div className="mt-2 flex gap-2">
                                <ToggleButton id={r.id} tenantId={tenantId} status={r.status} />
                                <DeleteButton id={r.id} tenantId={tenantId} />
                            </div>
                        </div>
                    </div>
                ))}
                {rows.length === 0 && (
                    <div className="card bg-base-100 border border-dashed border-base-300">
                        <div className="card-body text-sm opacity-70">No integrations yet. Use the form to add Slack (webhook) or Email.</div>
                    </div>
                )}
            </div>
        </div>
    )
}

function CreateForm({ tenantId }: { tenantId: string }) {
    async function action(formData: FormData) {
        'use server'
        const provider = String(formData.get('provider') || '')
        const name = String(formData.get('name') || '')
        const config_raw = String(formData.get('config') || '{}')
        let config: Record<string, unknown> = {}
        try { config = JSON.parse(config_raw) } catch { }
        if (!provider || !name) return
        await fetch(`${process.env.SITE_URL || ''}/api/integrations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
            body: JSON.stringify({ provider, name, config })
        })
    }
    return (
        <form action={action} className="join">
            <select name="provider" className="select select-bordered join-item" defaultValue="email">
                <option value="email">Email</option>
                <option value="slack">Slack</option>
            </select>
            <input name="name" className="input input-bordered join-item" placeholder="Display name" required />
            <input name="config" className="input input-bordered join-item w-72" placeholder='{"to":"you@example.com"}' />
            <button className="btn btn-primary join-item" type="submit"><i className="fa-duotone fa-plus mr-2" />Add</button>
        </form>
    )
}

function ToggleButton({ id, status, tenantId }: { id: string; status: string; tenantId: string }) {
    async function action() {
        'use server'
        const next = status === 'active' ? 'disabled' : 'active'
        await fetch(`${process.env.SITE_URL || ''}/api/integrations/${id}/status`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
            body: JSON.stringify({ status: next })
        })
    }
    return (<form action={action}><button className="btn btn-sm">{status === 'active' ? 'Disable' : 'Enable'}</button></form>)
}

function DeleteButton({ id, tenantId }: { id: string; tenantId: string }) {
    async function action() {
        'use server'
        await fetch(`${process.env.SITE_URL || ''}/api/integrations/${id}`, {
            method: 'DELETE',
            headers: { 'x-tenant-id': tenantId }
        })
    }
    return (<form action={action}><button className="btn btn-ghost btn-sm text-error"><i className="fa-duotone fa-trash mr-1" />Delete</button></form>)
}

function icon(p: string) {
    switch (p) {
        case 'email': return 'fa-envelope'
        case 'slack': return 'fa-slack'
        default: return 'fa-puzzle-piece'
    }
}
