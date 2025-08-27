'use client'
import React from 'react'
import { addEmailAddress, resendEmailVerification, attemptEmailVerification, setPrimaryEmailAddress } from '../server-actions'

type EmailRow = { id: string; emailAddress: string; verified: boolean; primary: boolean; verifying?: boolean; code?: string; settingPrimary?: boolean; resending?: boolean }
export default function EmailAddressesPanel({ initialEmails }: { initialEmails: EmailRow[] }) {
    const [emails, setEmails] = React.useState<EmailRow[]>(initialEmails)
    const [adding, setAdding] = React.useState(false)
    const [newEmail, setNewEmail] = React.useState('')
    const [error, setError] = React.useState('')

    async function handleAdd() {
        if (!newEmail) return
        setAdding(true); setError('')
        const res = await addEmailAddress(newEmail)
        if (res.ok && res.email) {
            setEmails(prev => [...prev, { ...res.email, verifying: true }])
            setNewEmail('')
        } else setError(res.error || 'Add failed')
        setAdding(false)
    }

    async function handleResend(id: string) {
        setEmails(prev => prev.map(e => e.id === id ? { ...e, resending: true } : e))
        const res = await resendEmailVerification(id)
        if (!res.ok) setError(res.error || 'Resend failed')
        setEmails(prev => prev.map(e => e.id === id ? { ...e, resending: false } : e))
    }

    async function handleVerify(id: string, code: string) {
        if (!code) return
        setEmails(prev => prev.map(e => e.id === id ? { ...e, verifying: true } : e))
        const res = await attemptEmailVerification(id, code)
        if (res.ok && res.verified) {
            setEmails(prev => prev.map(e => e.id === id ? { ...e, verified: true, verifying: false, code: '' } : e))
        } else {
            if (!res.ok) setError(res.error || 'Verify failed')
            setEmails(prev => prev.map(e => e.id === id ? { ...e, verifying: false } : e))
        }
    }

    async function handleSetPrimary(id: string) {
        setEmails(prev => prev.map(e => e.id === id ? { ...e, settingPrimary: true } : e))
        const res = await setPrimaryEmailAddress(id)
        if (res.ok) {
            setEmails(prev => prev.map(e => ({ ...e, primary: e.id === id })))
        } else setError(res.error || 'Primary failed')
        setEmails(prev => prev.map(e => e.id === id ? { ...e, settingPrimary: false } : e))
    }

    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm">
            <div className="p-6 space-y-5">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-12 h-12 bg-info/10 rounded-2xl flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-at text-lg text-info" aria-hidden />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-base-content">Email Addresses</h2>
                        <p className="text-sm text-base-content/60">Manage primary & verification</p>
                    </div>
                </div>
                {error && <div className="alert alert-error text-xs"><i className="fa-duotone fa-solid fa-triangle-exclamation" /> {error}</div>}
                <div className="space-y-3">
                    {emails.map(e => (
                        <div key={e.id} className="p-4 bg-base-200/30 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        {e.emailAddress}
                                        {e.primary && <span className="badge badge-primary badge-xs">Primary</span>}
                                        {e.verified ? <span className="badge badge-success badge-xs">Verified</span> : <span className="badge badge-warning badge-xs">Pending</span>}
                                    </div>
                                    {!e.verified && <div className="text-xs text-base-content/50 mt-1">Verification required</div>}
                                </div>
                                <div className="flex gap-2">
                                    {!e.primary && e.verified && <button onClick={() => handleSetPrimary(e.id)} className="btn btn-xs btn-outline rounded-lg" disabled={e.settingPrimary}>{e.settingPrimary ? 'Setting...' : 'Make Primary'}</button>}
                                    {!e.verified && <button onClick={() => handleResend(e.id)} className="btn btn-xs btn-outline rounded-lg" disabled={e.resending}>{e.resending ? 'Sending...' : 'Resend'}</button>}
                                </div>
                            </div>
                            {!e.verified && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Enter code"
                                        className="input input-xs input-bordered rounded-lg w-32"
                                        value={e.code || ''}
                                        onChange={(ev) => setEmails(prev => prev.map(x => x.id === e.id ? { ...x, code: ev.target.value } : x))}
                                        maxLength={8}
                                    />
                                    <button onClick={() => handleVerify(e.id, e.code || '')} className="btn btn-xs btn-primary rounded-lg" disabled={e.verifying || !(e.code || '').trim()}>{e.verifying ? 'Verifying...' : 'Verify'}</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="space-y-2 pt-2 border-t border-base-200/60">
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="Add email"
                            className="input input-sm input-bordered rounded-lg flex-1"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            disabled={adding}
                        />
                        <button onClick={handleAdd} className="btn btn-sm btn-outline rounded-xl" disabled={adding || !newEmail.trim()}>{adding ? 'Adding...' : 'Add'}</button>
                    </div>
                    <p className="text-xs text-base-content/50">A verification code will be emailed. Verify and optionally set as primary.</p>
                </div>
            </div>
        </div>
    )
}
