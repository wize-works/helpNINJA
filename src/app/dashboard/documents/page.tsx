import { getTenantIdServer } from "@/lib/auth";
import { query } from "@/lib/db";
import IngestForm from "@/components/ingest-form";

export const runtime = 'nodejs'

type DocRow = { id: string; url: string; title: string; created_at: string }

async function getDocs(tenantId: string) {
    const { rows } = await query<DocRow>(
        `select id, url, title, created_at from public.documents where tenant_id=$1 order by created_at desc limit 100`,
        [tenantId]
    )
    return rows
}

export default async function DocumentsPage() {
    const tenantId = await getTenantIdServer({ allowEnvFallback: true })
    const docs = await getDocs(tenantId)
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Documents</h1>
                <IngestForm tenantId={tenantId} />
            </div>
            <p className="text-sm opacity-70">Enter a full page URL to ingest that page, or a sitemap.xml to ingest multiple pages (up to plan limits).</p>
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>URL</th>
                                    <th>Added</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {docs.length === 0 && (
                                    <tr><td colSpan={4} className="p-6 text-center opacity-70">No documents yet. Add a site or page to ingest.</td></tr>
                                )}
                                {docs.map(d => (
                                    <tr key={d.id}>
                                        <td className="max-w-72 truncate" title={d.title}>{d.title || '(untitled)'}</td>
                                        <td className="max-w-96 truncate"><a className="link link-primary" href={d.url} target="_blank" rel="noreferrer">{d.url}</a></td>
                                        <td>{new Date(d.created_at).toLocaleString()}</td>
                                        <td className="text-right"><DeleteButton id={d.id} tenantId={tenantId} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Server action variant removed in favor of client component with inline errors

function DeleteButton({ id, tenantId }: { id: string; tenantId: string }) {
    async function action() {
        'use server'
        await fetch(`${process.env.SITE_URL || ''}/api/documents/${id}`, {
            method: 'DELETE',
            headers: { 'x-tenant-id': tenantId }
        })
    }
    return (
        <form action={action}><button className="btn btn-ghost btn-sm text-error"><i className="fa-duotone fa-trash mr-1" />Delete</button></form>
    )
}
