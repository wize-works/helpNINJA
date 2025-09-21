"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type Plan } from "@/lib/limits";

type UsageInfo = {
    used: number;
    limit: number;
    plan: string;
};

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
    usage: UsageInfo | null;
    usageLoading: boolean;
    usageError: string | null;
    usageOffline: boolean;
    refetch: () => Promise<void>;
    updateTenantInfo: (updates: Partial<TenantInfo>) => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ tenantId, children }: { tenantId: string; children: React.ReactNode }) {
    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [usage, setUsage] = useState<UsageInfo | null>(null);
    const [usageLoading, setUsageLoading] = useState(true);
    const [usageError, setUsageError] = useState<string | null>(null);
    const [usageOffline, setUsageOffline] = useState(false);

    const fetchTenantData = useCallback(async () => {
        if (!tenantId) {
            setLoading(false);
            setUsageLoading(false);
            return;
        }

        setError(null);
        setUsageError(null);
        setUsageOffline(false);

        try {
            const tenantRes = await fetch('/api/tenant/info');
            if (!tenantRes.ok) {
                throw new Error(`Failed to fetch tenant info: ${tenantRes.status}`);
            }

            const tenantJson = await tenantRes.json();
            setTenantInfo({
                id: tenantId,
                name: tenantJson.name,
                plan: tenantJson.plan,
                plan_status: tenantJson.plan_status,
                public_key: tenantJson.public_key
            });

            try {
                const usageRes = await fetch('/api/usage');
                if (!usageRes.ok) {
                    setUsage(null);
                    setUsageOffline(true);
                    setUsageError(`Failed to fetch usage: ${usageRes.status}`);
                } else {
                    const usageJson = await usageRes.json();
                    setUsage({
                        used: Number(usageJson.used ?? 0),
                        limit: Number(usageJson.limit ?? 0),
                        plan: String(usageJson.plan ?? '')
                    });
                    setUsageOffline(false);
                }
            } catch (usageErr) {
                setUsage(null);
                setUsageOffline(true);
                const message = usageErr instanceof Error ? usageErr.message : 'Failed to load usage information';
                setUsageError(message);
                console.error('Error fetching usage info:', usageErr);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load tenant information';
            setError(message);
            console.error('Error fetching tenant info:', err);
            setUsage(null);
            setUsageOffline(true);
            setUsageError(message);
        } finally {
            setLoading(false);
            setUsageLoading(false);
        }
    }, [tenantId]);

    const updateTenantInfo = useCallback((updates: Partial<TenantInfo>) => {
        setTenantInfo(current => current ? { ...current, ...updates } : null);
    }, []);

    const refetch = useCallback(async () => {
        setLoading(true);
        setUsageLoading(true);
        await fetchTenantData();
    }, [fetchTenantData]);

    useEffect(() => {
        fetchTenantData();
    }, [fetchTenantData]);

    const value: TenantContextValue = {
        tenantId,
        tenantInfo,
        loading,
        error,
        usage,
        usageLoading,
        usageError,
        usageOffline,
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
