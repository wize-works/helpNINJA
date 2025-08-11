import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
