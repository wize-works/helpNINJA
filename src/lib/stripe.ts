import Stripe from 'stripe';

// Lazy initialization to avoid issues during build time
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        const apiKey = process.env.STRIPE_SECRET_KEY;
        if (!apiKey) {
            throw new Error('STRIPE_SECRET_KEY environment variable is required');
        }
        _stripe = new Stripe(apiKey);
    }
    return _stripe;
}

// For backward compatibility
export const stripe = new Proxy({} as Stripe, {
    get(target, prop) {
        return getStripe()[prop as keyof Stripe];
    }
});

export const PRICE_BY_PLAN = {
    starter: process.env.STRIPE_PRICE_STARTER!,
    pro: process.env.STRIPE_PRICE_PRO!,
    agency: process.env.STRIPE_PRICE_AGENCY!,
} as const;

export type Plan = keyof typeof PRICE_BY_PLAN;

export function planFromPriceId(priceId?: string): Plan | null {
    if (!priceId) return null;
    // Support both legacy single-price envs and monthly/yearly envs
    const monthlyYearly: Record<Plan, Array<string | undefined>> = {
        starter: [
            process.env.STRIPE_PRICE_STARTER,
            process.env.STRIPE_PRICE_STARTER_MONTHLY,
            process.env.STRIPE_PRICE_STARTER_YEARLY,
        ],
        pro: [
            process.env.STRIPE_PRICE_PRO,
            process.env.STRIPE_PRICE_PRO_MONTHLY,
            process.env.STRIPE_PRICE_PRO_YEARLY,
        ],
        agency: [
            process.env.STRIPE_PRICE_AGENCY,
            process.env.STRIPE_PRICE_AGENCY_MONTHLY,
            process.env.STRIPE_PRICE_AGENCY_YEARLY,
        ],
    } as const;

    for (const [plan, ids] of Object.entries(monthlyYearly) as Array<[Plan, Array<string | undefined>]>) {
        if (ids.filter(Boolean).some((id) => id === priceId)) return plan;
    }
    return null;
}
