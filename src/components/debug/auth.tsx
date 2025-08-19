"use client";

import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import React from "react";
import { useTenant } from "@/components/tenant-context";

export default function AuthDebugPanel() {
    const sp = useSearchParams();
    const isDev = process.env.NODE_ENV !== 'production';
    const [open, setOpen] = React.useState(false);

    const { isLoaded: authLoaded, userId, orgId, sessionId } = useAuth();
    const { isLoaded: userLoaded, user } = useUser();
    const { isLoaded: orgLoaded, organization } = useOrganization();

    // Use tenant context instead of manual fetching
    const { tenantId, tenantInfo, loading: tenantLoading, error: tenantError } = useTenant();

    React.useEffect(() => {
        if (sp.get('debug') === 'auth') setOpen(true);
    }, [sp]);

    if (!isDev && sp.get('debug') !== 'auth') return null;

    const data = {
        env: process.env.NODE_ENV,
        auth: { loaded: authLoaded, isSignedIn: !!userId, userId, orgId, sessionId },
        user: userLoaded && user ? {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName
        } : null,
        organization: orgLoaded && organization ? {
            id: organization.id,
            name: organization.name,
        } : null,
        tenant: {
            id: tenantId,
            loading: tenantLoading,
            error: tenantError,
            info: tenantInfo ? {
                id: tenantInfo.id,
                name: tenantInfo.name,
                plan: tenantInfo.plan,
                plan_status: tenantInfo.plan_status,
                public_key: tenantInfo.public_key ? `${tenantInfo.public_key.substring(0, 8)}...` : null
            } : null
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="btn btn-xs btn-outline rounded-lg mb-2"
                aria-expanded={open}
            >
                Auth & Tenant Debug
            </button>
            {open && (
                <div className="w-[26rem] max-w-[90vw] max-h-[50vh] overflow-auto p-3 rounded-xl shadow-xl border bg-base-200 text-xs">
                    <div className="font-semibold mb-2">Auth & Tenant Debug Panel</div>
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11px]">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                    <div className="mt-2 opacity-60">
                        Tip: append <code>?debug=auth</code> to force-enable in non-dev.
                    </div>
                </div>
            )}
        </div>
    );
}