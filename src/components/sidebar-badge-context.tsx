"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export interface SidebarBadges {
    knowledge: {
        sites: number | null;
        sources: number | null;
        documents: number | null;
        answers: number | null;
        crawlFailures: number | null;
        widget: number | null;
    };
    conversations: number | null;
    feedback: number | null;
    integrations: {
        installed: number;
        marketplace: number;
    };
    automation: {
        rules: number;
        outbox: number;
    };
}

export interface SidebarBadgeContextValue {
    badges: SidebarBadges;
    loading: boolean;
    refreshBadges: () => Promise<void>;
}

const SidebarBadgeContext = createContext<SidebarBadgeContextValue | null>(null);

export function useSidebarBadges(): SidebarBadgeContextValue {
    const context = useContext(SidebarBadgeContext);
    if (!context) {
        throw new Error('useSidebarBadges must be used within a SidebarBadgeProvider');
    }
    return context;
}

export function SidebarBadgeProvider({ children }: { children: React.ReactNode }) {
    const [badges, setBadges] = useState<SidebarBadges>({
        knowledge: {
            sites: null,
            sources: null,
            documents: null,
            answers: null,
            crawlFailures: null,
            widget: null
        },
        conversations: null,
        feedback: null,
        integrations: { installed: 0, marketplace: 0 },
        automation: { rules: 0, outbox: 0 }
    });
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const lastFetchRef = useRef<number>(0);

    const refreshBadges = useCallback(async () => {
        if (loading || !isReady) return;

        // Throttle calls to prevent spam
        const now = Date.now();
        if (now - lastFetchRef.current < 1000) return;
        lastFetchRef.current = now;

        setLoading(true);
        try {
            const response = await fetch('/api/sidebar/badges', {
                method: 'GET',
                cache: 'no-store',
                credentials: 'include', // Include cookies for authentication
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data: SidebarBadges = await response.json();
                setBadges(data);
            } else if (response.status === 401) {
                console.warn('Sidebar badges: User not authenticated');
                // Don't log error for auth issues, just silently fail
            } else {
                console.error('Failed to fetch sidebar badges:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Failed to fetch sidebar badges:', error);
        } finally {
            setLoading(false);
        }
    }, [loading, isReady]);

    // Initialize after auth setup
    useEffect(() => {
        // Give time for authentication to set up
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    // Initial load when ready
    useEffect(() => {
        if (isReady) {
            refreshBadges();
        }
    }, [refreshBadges, isReady]);

    const value: SidebarBadgeContextValue = {
        badges,
        loading,
        refreshBadges
    };

    return (
        <SidebarBadgeContext.Provider value={value}>
            {children}
        </SidebarBadgeContext.Provider>
    );
}