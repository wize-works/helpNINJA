'use client'
import { UserProfile } from '@clerk/nextjs'
import React from 'react'

// Wrapper to apply theme classes and constrain width
export default function UserProfilePanel() {
    return (
        <div className="clerk-portal-wrapper">
            <UserProfile
                appearance={{
                    elements: {
                        rootBox: 'w-full',
                        card: 'bg-base-100 shadow-none border border-base-300/40 rounded-xl w-full max-w-none',
                        headerTitle: 'text-base-content',
                        headerSubtitle: 'text-base-content/60',
                        navbar: 'bg-base-200/40 border-r border-base-300/40',
                        navbarButton: 'text-sm',
                        formButtonPrimary: 'btn btn-primary rounded-xl',
                        formFieldInput: 'input input-bordered rounded-xl bg-base-200/40',
                        profileSectionPrimaryButton: 'btn btn-outline rounded-xl',
                        avatarImage: 'rounded-lg'
                    },
                    variables: {
                        colorPrimary: 'hsl(var(--p))'
                    }
                }}
                routing="hash"
            />
        </div>
    )
}
