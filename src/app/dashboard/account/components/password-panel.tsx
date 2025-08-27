'use client'
import React from 'react'
import { changePassword } from '../server-actions'

export default function PasswordPanel() {
    const [current, setCurrent] = React.useState('')
    const [next, setNext] = React.useState('')
    const [confirm, setConfirm] = React.useState('')
    const [status, setStatus] = React.useState<'idle' | 'saving' | 'error' | 'saved'>('idle')
    const [error, setError] = React.useState('')

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (next !== confirm) { setError('Passwords do not match'); setStatus('error'); return }
        setStatus('saving'); setError('')
        const res = await changePassword({ current, next })
        if (res.ok) { setStatus('saved'); setCurrent(''); setNext(''); setConfirm(''); setTimeout(() => setStatus('idle'), 2500) } else { setStatus('error'); setError(res.error || 'Failed') }
    }

    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm">
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-12 h-12 bg-warning/10 rounded-2xl flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-key text-lg text-warning" aria-hidden />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-base-content">Password & Authentication</h2>
                        <p className="text-sm text-base-content/60">Update password & plan MFA (coming soon)</p>
                    </div>
                </div>
                <form onSubmit={onSubmit} className="space-y-4">
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Current Password</legend>
                        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className="input w-full" placeholder="••••••••" required />
                    </fieldset>
                    <fieldset className="fieldset">
                        <label className="label text-sm font-medium">New Password</label>
                        <input type="password" value={next} onChange={e => setNext(e.target.value)} className="input w-full" placeholder="New password" minLength={8} required />
                    </fieldset>
                    <fieldset className="fieldset">
                        <label className="label text-sm font-medium">Confirm Password</label>
                        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input w-full" placeholder="Repeat new password" minLength={8} required />
                    </fieldset>
                    <div className="flex items-center gap-3">
                        <button disabled={status === 'saving'} className="btn btn-primary rounded-xl">
                            {status === 'saving' && <span className="loading loading-spinner loading-sm mr-2" />}
                            <i className="fa-duotone fa-solid fa-floppy-disk mr-2" aria-hidden />
                            {status === 'saving' ? 'Updating...' : 'Update Password'}
                        </button>
                        {status === 'saved' && <span className="text-success text-xs flex items-center gap-1"><i className="fa-duotone fa-solid fa-circle-check" /> Saved</span>}
                        {status === 'error' && <span className="text-error text-xs flex items-center gap-1"><i className="fa-duotone fa-solid fa-triangle-exclamation" /> {error}</span>}
                    </div>
                    <div className="divider my-6">MFA (Coming Soon)</div>
                    <div className="space-y-3 opacity-60 pointer-events-none">
                        <div className="flex items-center justify-between p-4 bg-base-200/30 rounded-xl">
                            <div>
                                <div className="font-medium">Authenticator App</div>
                                <div className="text-xs text-base-content/50">Time-based one-time codes</div>
                            </div>
                            <button className="btn btn-sm btn-outline rounded-xl">Enable</button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-base-200/30 rounded-xl">
                            <div>
                                <div className="font-medium">Recovery Codes</div>
                                <div className="text-xs text-base-content/50">Backup access for MFA</div>
                            </div>
                            <button className="btn btn-sm btn-outline rounded-xl">Generate</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
