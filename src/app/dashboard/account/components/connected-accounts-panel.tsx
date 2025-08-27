'use client'
import React from 'react'
import { unlinkExternalAccount } from '../server-actions'
import { useUser } from '@clerk/nextjs'

type Ext = { id: string; provider: string; busy?: boolean }

export default function ConnectedAccountsPanel({ accounts }: { accounts: Ext[] }) {
    const [list, setList] = React.useState(accounts)
    const [error, setError] = React.useState('')
    const [confirming, setConfirming] = React.useState<string | null>(null)

    // Placeholder list of common providers; linking flow will be implemented when Clerk hook available.
    const availableProviders: Array<{ key: string; label: string; strategy: OAuthStrategy }> = [
        { key: 'google', label: 'Google', strategy: 'oauth_google' },
        { key: 'github', label: 'GitHub', strategy: 'oauth_github' },
        { key: 'microsoft', label: 'Microsoft', strategy: 'oauth_microsoft' },
        { key: 'slack', label: 'Slack', strategy: 'oauth_slack' }
    ]

    const linkedKeys = new Set(list.map(l => l.provider.toLowerCase()))
    const unlinked = availableProviders.filter(p => !linkedKeys.has(p.key))

    function providerIcon(provider: string) {
        const p = provider.toLowerCase()
        if (p.includes('google')) return <i className="fa-brands fa-google text-error" />
        if (p.includes('github')) return <i className="fa-brands fa-github" />
        if (p.includes('microsoft')) return <i className="fa-brands fa-microsoft text-primary" />
        if (p.includes('facebook')) return <i className="fa-brands fa-facebook text-sky-600" />
        if (p.includes('slack')) return <i className="fa-brands fa-slack" />
        return <i className="fa-duotone fa-solid fa-plug" />
    }

    async function handleUnlink(id: string) {
        setConfirming(null)
        const prev = list
        setList(prev.map(a => a.id === id ? { ...a, busy: true } : a))
        const res = await unlinkExternalAccount(id)
        if (res.ok) setList(prev.filter(a => a.id !== id))
        else { setList(prev); setError(res.error || 'Failed') }
    }

    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm">
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-plug text-lg text-accent" aria-hidden />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-base-content">Connected Accounts</h2>
                        <p className="text-sm text-base-content/60">Social / SSO providers linked</p>
                    </div>
                </div>
                {error && <div className="alert alert-error text-xs"><i className="fa-duotone fa-solid fa-triangle-exclamation" /> {error}</div>}
                <div className="space-y-3">
                    {list.length === 0 && <div className="text-sm text-base-content/50">No external accounts linked.</div>}
                    {list.map(a => {
                        const isConfirm = confirming === a.id
                        return (
                            <div key={a.id} className="p-4 bg-base-200/30 rounded-xl flex items-center justify-between">
                                <div className="font-medium flex items-center gap-2 capitalize">
                                    {providerIcon(a.provider)} <span className="ml-1">{a.provider}</span>
                                </div>
                                <div className="flex gap-2">
                                    {!isConfirm && <button onClick={() => setConfirming(a.id)} className="btn btn-xs btn-outline rounded-lg" disabled={a.busy}>{a.busy ? '...' : 'Unlink'}</button>}
                                    {isConfirm && (
                                        <>
                                            <button onClick={() => handleUnlink(a.id)} className="btn btn-xs btn-error rounded-lg" disabled={a.busy}>{a.busy ? 'Working...' : 'Confirm'}</button>
                                            <button onClick={() => setConfirming(null)} className="btn btn-xs btn-ghost rounded-lg" disabled={a.busy}>Cancel</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                {unlinked.length > 0 && (
                    <div className="pt-2 border-t border-base-200/60 space-y-2">
                        <div className="text-xs text-base-content/60 font-medium">Link a new provider</div>
                        <div className="flex flex-wrap gap-2">
                            {unlinked.map(p => (
                                <LinkButton key={p.key} provider={p} onError={setError} />
                            ))}
                        </div>
                        <div className="text-[11px] text-base-content/50">After OAuth completes you&apos;ll return here and the account will appear above.</div>
                    </div>
                )}
            </div>
        </div>
    )
}

type OAuthStrategy = 'oauth_google' | 'oauth_github' | 'oauth_microsoft' | 'oauth_slack'
interface LinkButtonProps { provider: { key: string; label: string; strategy: OAuthStrategy }; onError(msg: string): void }
function LinkButton({ provider, onError }: LinkButtonProps) {
    const { isLoaded, user } = useUser()
    const [loading, setLoading] = React.useState(false)
    async function start() {
        if (!isLoaded || !user) return
        // Attempt to access experimental createExternalAccount without unsafe any casting
        type UserWithLink = typeof user & { createExternalAccount?: (opts: { strategy: OAuthStrategy; redirectUrl?: string; redirectUrlComplete?: string }) => Promise<unknown> }
        const maybe = user as UserWithLink
        if (typeof maybe.createExternalAccount !== 'function') {
            onError('Linking not supported in this Clerk SDK version')
            return
        }
        setLoading(true)
        try {
            await maybe.createExternalAccount({
                strategy: provider.strategy,
                redirectUrl: '/dashboard/account',
                redirectUrlComplete: '/dashboard/account'
            })
            // Clerk will redirect; if it returns synchronously (popup-based future), force refresh.
            setTimeout(() => { try { window.location.reload() } catch { /* ignore */ } }, 4000)
        } catch (e: unknown) {
            const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'link_failed'
            onError(msg)
        } finally { setLoading(false) }
    }
    return (
        <button onClick={start} disabled={loading || !isLoaded} className="btn btn-xs btn-outline rounded-lg">
            {loading ? 'Starting…' : `Link ${provider.label}`}
        </button>
    )
}
