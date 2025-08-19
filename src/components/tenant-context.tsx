"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type Plan } from "@/lib/limits";

export type TenantInfo = {
    id: string;
    name: string;
    plan: Plan;
    plan_status: 'active' | 'trialing' | 'inactive' | 'past_due' | 'canceled';
    public_key: string | null;
};

export type TenantContextValue = {
    tenantId: string;
    tenantInfo: TenantInfo | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    updateTenantInfo: (updates: Partial<TenantInfo>) => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ tenantId, children }: { tenantId: string; children: React.ReactNode }) {
    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTenantInfo = useCallback(async () => {
        if (!tenantId) {
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const response = await fetch('/api/tenant/info', {
                headers: { 'x-tenant-id': tenantId }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tenant info: ${response.status}`);
            }

            const data = await response.json();
            setTenantInfo({
                id: tenantId,
                name: data.name,
                plan: data.plan,
                plan_status: data.plan_status,
                public_key: data.public_key
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load tenant information';
            setError(message);
            console.error('Error fetching tenant info:', err);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    const updateTenantInfo = useCallback((updates: Partial<TenantInfo>) => {
        setTenantInfo(current => current ? { ...current, ...updates } : null);
    }, []);

    const refetch = useCallback(async () => {
        setLoading(true);
        await fetchTenantInfo();
    }, [fetchTenantInfo]);

    useEffect(() => {
        fetchTenantInfo();
    }, [fetchTenantInfo]);

    const value: TenantContextValue = {
        tenantId,
        tenantInfo,
        loading,
        error,
        refetch,
        updateTenantInfo
    };

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
    const ctx = useContext(TenantContext);
    if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
    return ctx;
}
