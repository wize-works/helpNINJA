"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { type Role } from '@/lib/permissions';

type User = {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    role: Role;
    tenant_id: string;
};

type UserContextType = {
    user: User | null;
    loading: boolean;
    updateUser: (updates: Partial<User>) => void;
    hasRole: (role: Role) => boolean;
    isAtLeastRole: (role: Role) => boolean;
};

const UserContext = createContext<UserContextType | null>(null);

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within UserProvider');
    }
    return context;
}

interface UserProviderProps {
    children: ReactNode;
    tenantId: string;
}

export function UserProvider({ children, tenantId }: UserProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const loadCurrentUser = useCallback(async () => {
        try {
            // In a real implementation, this would get the current authenticated user
            // For demo purposes, we'll create a mock admin user
            const mockUser: User = {
                id: 'demo-user-id',
                email: 'admin@example.com',
                first_name: 'Demo',
                last_name: 'Admin',
                role: 'admin',
                tenant_id: tenantId
            };

            setUser(mockUser);
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        if (tenantId) void loadCurrentUser();
    }, [tenantId, loadCurrentUser]);

    const updateUser = (updates: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...updates } : null);
    };

    const hasRole = (role: Role): boolean => {
        return user?.role === role;
    };

    const isAtLeastRole = (role: Role): boolean => {
        if (!user) return false;

        const roleHierarchy: Record<Role, number> = {
            owner: 5,
            admin: 4,
            analyst: 3,
            support: 2,
            viewer: 1
        };

        const userLevel = roleHierarchy[user.role] || 0;
        const requiredLevel = roleHierarchy[role] || 0;

        return userLevel >= requiredLevel;
    };

    return (
        <UserContext.Provider value={{
            user,
            loading,
            updateUser,
            hasRole,
            isAtLeastRole
        }}>
            {children}
        </UserContext.Provider>
    );
}
