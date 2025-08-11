"use client";

import React, { createContext, useContext } from "react";

export type TenantContextValue = {
    tenantId: string;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ tenantId, children }: { tenantId: string; children: React.ReactNode }) {
    return <TenantContext.Provider value={{ tenantId }}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
    const ctx = useContext(TenantContext);
    if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
    return ctx;
}
