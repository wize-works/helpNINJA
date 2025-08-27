'use client'

import React from 'react'

export default function ProfileForm({ initialFirstName, initialLastName, action }: { initialFirstName: string; initialLastName: string; action: (fd: FormData) => Promise<{ ok: boolean }> }) {
    const [firstName, setFirstName] = React.useState(initialFirstName)
    const [lastName, setLastName] = React.useState(initialLastName)
    const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [error, setError] = React.useState('')

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setStatus('saving')
        setError('')
        try {
            const fd = new FormData()
            fd.set('firstName', firstName)
            fd.set('lastName', lastName)
            const res = await action(fd)
            if (res.ok) {
                setStatus('saved')
                setTimeout(() => setStatus('idle'), 2500)
            } else {
                setStatus('error')
                setError('Update failed')
            }
        } catch (err: unknown) {
            type WithMessage = { message?: unknown }
            const message = typeof err === 'object' && err && 'message' in err ? String((err as WithMessage).message || 'Update failed') : 'Update failed'
            setError(message)
            setStatus('error')
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                    <label className="label" htmlFor="firstName">
                        <span className="label-text text-sm font-medium">First Name</span>
                    </label>
                    <input id="firstName" name="firstName" required value={firstName} onChange={e => setFirstName(e.target.value)} className="input input-bordered rounded-xl bg-base-200/40" placeholder="Jane" />
                </div>
                <div className="form-control">
                    <label className="label" htmlFor="lastName">
                        <span className="label-text text-sm font-medium">Last Name</span>
                    </label>
                    <input id="lastName" name="lastName" value={lastName} onChange={e => setLastName(e.target.value)} className="input input-bordered rounded-xl bg-base-200/40" placeholder="Doe" />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button type="submit" disabled={status === 'saving'} className="btn btn-primary rounded-xl">
                    {status === 'saving' && <span className="loading loading-spinner loading-sm mr-2" />}
                    <i className="fa-duotone fa-solid fa-floppy-disk mr-2" aria-hidden />
                    {status === 'saving' ? 'Saving...' : 'Save Changes'}
                </button>
                {status === 'saved' && <span className="text-success text-sm flex items-center gap-1"><i className="fa-duotone fa-solid fa-circle-check" aria-hidden /> Saved</span>}
                {status === 'error' && <span className="text-error text-sm flex items-center gap-1"><i className="fa-duotone fa-solid fa-triangle-exclamation" aria-hidden /> {error}</span>}
            </div>
        </form>
    )
}
