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
    const entry = Object.entries(PRICE_BY_PLAN).find(([, id]) => id === priceId);
    return (entry?.[0] as Plan) || null;
}
