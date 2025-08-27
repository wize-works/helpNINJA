"use client"
import React from 'react'
import { uploadAvatar, removeAvatar } from '../server-actions'

interface Props {
    initialImageUrl: string
    fallbackLetter: string
}

export default function AvatarPanel({ initialImageUrl, fallbackLetter }: Props) {
    const [imageUrl, setImageUrl] = React.useState(initialImageUrl)
    const [uploading, setUploading] = React.useState(false)
    const [removing, setRemoving] = React.useState(false)
    const [error, setError] = React.useState('')
    const inputRef = React.useRef<HTMLInputElement | null>(null)

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setError('')
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await uploadAvatar(fd)
            if (res.ok) {
                if (res.imageUrl) setImageUrl(res.imageUrl)
            } else {
                setError(res.error || 'Upload failed')
            }
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    async function handleRemove() {
        setError('')
        setRemoving(true)
        const res = await removeAvatar()
        if (!res.ok) setError(res.error || 'Remove failed')
        else setImageUrl('')
        setRemoving(false)
    }

    return (
        <div className="flex items-center gap-6">
            <div className="avatar">
                {imageUrl ? (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center text-2xl font-bold">
                        {fallbackLetter}
                    </div>
                )}
            </div>
            <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="file-input file-input-bordered file-input-sm rounded-lg"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    {imageUrl && (
                        <button type="button" onClick={handleRemove} className="btn btn-outline btn-sm rounded-lg" disabled={removing}>
                            {removing ? 'Removing...' : 'Remove'}
                        </button>
                    )}
                </div>
                <p className="text-xs text-base-content/50">PNG, JPG, WebP, or GIF up to 5MB.</p>
                {error && <div className="text-xs text-error flex items-center gap-1"><i className="fa-duotone fa-solid fa-triangle-exclamation" /> {error}</div>}
                {(uploading || removing) && <div className="text-xs text-base-content/40">{uploading ? 'Uploading...' : 'Applying changes...'}</div>}
            </div>
        </div>
    )
}
