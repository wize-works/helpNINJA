'use client'
import React from 'react'
import { listSessions, revokeSession } from '../server-actions'

type SessionRow = { id: string; latestActivityAt: string; current: boolean; status?: string; revoking?: boolean; device?: string }

interface SessionsPanelProps { currentSessionId?: string }

export default function SessionsPanel({ currentSessionId }: SessionsPanelProps) {
    const [sessions, setSessions] = React.useState<SessionRow[] | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [refreshing, setRefreshing] = React.useState(false)
    const [error, setError] = React.useState('')

    const fetchSessions = React.useCallback(async (opts?: { initial?: boolean }) => {
        const isInitial = opts?.initial
        if (isInitial) setLoading(true); else setRefreshing(true)
        try {
            const r = await listSessions()
            if (r.ok) {
                const rows = (r.sessions || []).map(s => ({ ...s, current: currentSessionId ? s.id === currentSessionId : s.current }))
                setSessions(rows)
                if (!r.sessions || r.sessions.length === 0) setError('')
            } else {
                setError(r.error || 'Failed')
            }
        } finally {
            if (isInitial) setLoading(false); else setRefreshing(false)
        }
    }, [currentSessionId])

    React.useEffect(() => { fetchSessions({ initial: true }) }, [fetchSessions])

    async function handleRevoke(id: string) {
        const prev = sessions || []
        setSessions(prev.map(s => s.id === id ? { ...s, revoking: true } : s))
        const res = await revokeSession(id)
        if (!res.ok) {
            setSessions(prev)
            setError(res.error || 'Revoke failed')
            return
        }
        // Optimistic removal, then definitive refresh to ensure server truth
        setSessions(prev.filter(s => s.id !== id))
        await fetchSessions()
    }

    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm">
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-laptop-mobile text-lg text-secondary" aria-hidden />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-base-content">Active Sessions</h2>
                        <p className="text-sm text-base-content/60">Revoke device/browser access</p>
                    </div>
                </div>
                {error && <div className="alert alert-error text-xs"><i className="fa-duotone fa-solid fa-triangle-exclamation" /> {error}</div>}
                <div className="space-y-3 min-h-[60px]">
                    {loading && <div className="loading loading-spinner loading-md" />}
                    {!loading && sessions && sessions.length === 0 && <div className="text-sm text-base-content/50">No active sessions.</div>}
                    {refreshing && !loading && <div className="text-xs text-base-content/40">Refreshing…</div>}
                    {sessions && sessions.map(s => {
                        const isCurrent = s.current
                        return (
                            <div key={s.id} className="p-4 bg-base-200/30 rounded-xl flex items-center justify-between">
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        Session {s.id.slice(0, 8)}
                                        {isCurrent && <span className="badge badge-primary badge-xs">Current</span>}
                                        {s.status && !isCurrent && <span className="badge badge-ghost badge-xs capitalize">{s.status}</span>}
                                    </div>
                                    <div className="text-xs text-base-content/50 flex flex-col gap-0.5">
                                        <span>Last activity {new Date(s.latestActivityAt).toLocaleString()}</span>
                                        {s.device && <span className="text-[11px] text-base-content/40">{s.device}</span>}
                                    </div>
                                </div>
                                {!isCurrent && <button onClick={() => handleRevoke(s.id)} className="btn btn-xs btn-outline rounded-lg" disabled={s.revoking}>{s.revoking ? 'Revoking...' : 'Revoke'}</button>}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
