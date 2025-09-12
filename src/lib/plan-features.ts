import { query } from '@/lib/db';
import type { Plan } from '@/lib/limits';

export type PlanFeature =
    | 'basic_analytics'
    | 'advanced_analytics'
    | 'api_access'
    | 'email_escalation'
    | 'integration_marketplace'
    | 'custom_integrations'
    | 'priority_support'
    | 'advanced_rules'
    | 'conversation_management'
    | 'webhook_management'
    | 'data_export'
    | 'custom_branding'
    | 'advanced_reporting'
    | 'sso_integration';

export const PLAN_FEATURES: Record<Plan, PlanFeature[]> = {
    none: ['basic_analytics'],
    starter: ['basic_analytics', 'email_escalation', 'api_access'],
    pro: [
        'basic_analytics',
        'advanced_analytics',
        'api_access',
        'integration_marketplace',
        'conversation_management',
        'webhook_management',
        'data_export'
    ],
    agency: [
        'basic_analytics',
        'advanced_analytics',
        'api_access',
        'integration_marketplace',
        'custom_integrations',
        'priority_support',
        'advanced_rules',
        'conversation_management',
        'webhook_management',
        'data_export',
        'custom_branding',
        'advanced_reporting',
        'sso_integration'
    ]
};

export interface FeatureCheckResult {
    hasAccess: boolean;
    currentPlan: Plan;
    reason?: string;
    suggestedPlan?: Plan;
}

/**
 * Get the current plan for a tenant
 */
export async function getTenantPlan(tenantId: string): Promise<Plan> {
    try {
        const result = await query<{ plan: Plan; plan_status: string }>(
            'SELECT plan, plan_status FROM public.tenants WHERE id = $1',
            [tenantId]
        );

        const tenant = result.rows[0];
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        // If plan is inactive, treat as 'none'
        if (tenant.plan_status !== 'active' && tenant.plan_status !== 'trialing') {
            return 'none';
        }

        return tenant.plan || 'none';
    } catch (error) {
        console.error('Error fetching tenant plan:', error);
        return 'none';
    }
}

/**
 * Check if a tenant has access to a specific feature
 */
export async function hasFeature(tenantId: string, feature: PlanFeature): Promise<FeatureCheckResult> {
    const currentPlan = await getTenantPlan(tenantId);
    const hasAccess = PLAN_FEATURES[currentPlan].includes(feature);

    if (hasAccess) {
        return { hasAccess: true, currentPlan };
    }

    // Find the minimum plan that includes this feature
    const suggestedPlan = findMinimumPlanForFeature(feature);

    return {
        hasAccess: false,
        currentPlan,
        reason: `Feature '${feature}' not available on '${currentPlan}' plan`,
        suggestedPlan
    };
}

/**
 * Find the minimum plan that includes a feature
 */
export function findMinimumPlanForFeature(feature: PlanFeature): Plan | undefined {
    const plans: Plan[] = ['starter', 'pro', 'agency'];

    for (const plan of plans) {
        if (PLAN_FEATURES[plan].includes(feature)) {
            return plan;
        }
    }

    return undefined;
}

/**
 * Check if tenant has access to multiple features (all must be available)
 */
export async function hasAllFeatures(tenantId: string, features: PlanFeature[]): Promise<FeatureCheckResult> {
    const currentPlan = await getTenantPlan(tenantId);
    const availableFeatures = PLAN_FEATURES[currentPlan];

    const missingFeatures = features.filter(feature => !availableFeatures.includes(feature));

    if (missingFeatures.length === 0) {
        return { hasAccess: true, currentPlan };
    }

    // Find highest plan needed for all features
    const suggestedPlan = findMinimumPlanForAllFeatures(features);

    return {
        hasAccess: false,
        currentPlan,
        reason: `Features not available on '${currentPlan}' plan: ${missingFeatures.join(', ')}`,
        suggestedPlan
    };
}

/**
 * Find minimum plan that includes all specified features
 */
export function findMinimumPlanForAllFeatures(features: PlanFeature[]): Plan | undefined {
    const plans: Plan[] = ['starter', 'pro', 'agency'];

    for (const plan of plans) {
        const planFeatures = PLAN_FEATURES[plan];
        if (features.every(feature => planFeatures.includes(feature))) {
            return plan;
        }
    }

    return undefined;
}

/**
 * Check if tenant has access to any of the specified features
 */
export async function hasAnyFeature(tenantId: string, features: PlanFeature[]): Promise<FeatureCheckResult> {
    const currentPlan = await getTenantPlan(tenantId);
    const availableFeatures = PLAN_FEATURES[currentPlan];

    const hasAnyAccess = features.some(feature => availableFeatures.includes(feature));

    if (hasAnyAccess) {
        return { hasAccess: true, currentPlan };
    }

    const suggestedPlan = findMinimumPlanForFeature(features[0]);

    return {
        hasAccess: false,
        currentPlan,
        reason: `None of the required features available on '${currentPlan}' plan`,
        suggestedPlan
    };
}

/**
 * Middleware function to require specific plan features
 */
export function requireFeature(feature: PlanFeature) {
    return async (tenantId: string): Promise<void> => {
        const result = await hasFeature(tenantId, feature);

        if (!result.hasAccess) {
            const upgradeMessage = result.suggestedPlan
                ? ` Please upgrade to '${result.suggestedPlan}' plan or higher.`
                : '';
            throw new Error(result.reason + upgradeMessage);
        }
    };
}

/**
 * Middleware function to require multiple features
 */
export function requireAllFeatures(features: PlanFeature[]) {
    return async (tenantId: string): Promise<void> => {
        const result = await hasAllFeatures(tenantId, features);

        if (!result.hasAccess) {
            const upgradeMessage = result.suggestedPlan
                ? ` Please upgrade to '${result.suggestedPlan}' plan or higher.`
                : '';
            throw new Error(result.reason + upgradeMessage);
        }
    };
}

/**
 * Get all features available for a tenant's current plan
 */
export async function getAvailableFeatures(tenantId: string): Promise<PlanFeature[]> {
    const plan = await getTenantPlan(tenantId);
    return [...PLAN_FEATURES[plan]];
}

/**
 * Get features comparison between plans
 */
export function getFeatureComparison(): Record<Plan, PlanFeature[]> {
    return { ...PLAN_FEATURES };
}

/**
 * Check if feature is generally available (exists in any plan)
 */
export function isFeatureAvailable(feature: PlanFeature): boolean {
    return Object.values(PLAN_FEATURES).some(features => features.includes(feature));
}

/**
 * Get plan upgrade suggestions for a feature
 */
export function getUpgradeSuggestions(currentPlan: Plan, desiredFeature: PlanFeature): {
    availablePlans: Plan[];
    recommendedPlan: Plan | null;
} {
    const plans: Plan[] = ['starter', 'pro', 'agency'];
    const currentIndex = plans.indexOf(currentPlan);

    const availablePlans = plans
        .slice(currentIndex + 1)
        .filter(plan => PLAN_FEATURES[plan].includes(desiredFeature));

    return {
        availablePlans,
        recommendedPlan: availablePlans[0] || null
    };
}

/**
 * Feature categories for UI organization
 */
export const FEATURE_CATEGORIES = {
    analytics: ['basic_analytics', 'advanced_analytics', 'advanced_reporting'],
    integrations: ['email_escalation', 'integration_marketplace', 'custom_integrations'],
    automation: ['advanced_rules', 'webhook_management'],
    management: ['conversation_management', 'api_access'],
    enterprise: ['priority_support', 'custom_branding', 'sso_integration', 'data_export']
} as const;

/**
 * Get features by category
 */
export function getFeaturesByCategory(category: keyof typeof FEATURE_CATEGORIES): readonly PlanFeature[] {
    return FEATURE_CATEGORIES[category];
}

/**
 * Check plan limits bypass (for development/testing)
 */
export function isPlanLimitsBypassed(): boolean {
    return process.env.DISABLE_PLAN_LIMITS === 'true' || process.env.DISABLE_PLAN_LIMITS === '1';
}

/**
 * Enhanced feature check that respects bypass flag
 */
export async function hasFeatureWithBypass(tenantId: string, feature: PlanFeature): Promise<FeatureCheckResult> {
    if (isPlanLimitsBypassed()) {
        return { hasAccess: true, currentPlan: 'agency' };
    }

    return hasFeature(tenantId, feature);
}