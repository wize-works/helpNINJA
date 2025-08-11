import { getTenantIdServer } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = 'nodejs'

type Row = { id: string; session_id: string; created_at: string; messages: number }

async function list(tenantId: string) {
    const { rows } = await query<Row>(
        `select c.id, c.session_id, c.created_at,
            (select count(*) from public.messages m where m.conversation_id=c.id)::int as messages
     from public.conversations c
     where c.tenant_id=$1
     order by c.created_at desc
     limit 100`,
        [tenantId]
    )
    return rows
}

export default async function ConversationsPage() {
    const tenantId = await getTenantIdServer({ allowEnvFallback: true })
    const rows = await list(tenantId)
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Conversations</h1>
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Session</th>
                                    <th>Messages</th>
                                    <th>Started</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 && (
                                    <tr><td colSpan={3} className="p-6 text-center opacity-70">No conversations yet.</td></tr>
                                )}
                                {rows.map(r => (
                                    <tr key={r.id}>
                                        <td className="font-mono text-xs">{r.session_id}</td>
                                        <td>{r.messages}</td>
                                        <td>{new Date(r.created_at).toLocaleString()}</td>
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
