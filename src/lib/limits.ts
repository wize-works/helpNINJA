export type Plan = 'none' | 'starter' | 'pro' | 'agency';

export const PLAN_LIMITS: Record<Plan, { sites: number; messages: number }> = {
    none: { sites: 0, messages: 10 }, // Trial limits for testing only
    starter: { sites: 1, messages: 1000 },
    pro: { sites: 3, messages: 5000 },
    agency: { sites: 10, messages: 20000 },
};

export function currentPeriodStartUTC(): string {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
