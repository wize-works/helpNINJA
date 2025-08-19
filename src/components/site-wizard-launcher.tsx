import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { PLAN_LIMITS, Plan } from "@/lib/limits";
import SiteWizardButton from "@/components/site-wizard-button";

export default async function SiteWizardLauncher() {
    const tenantId = await getTenantIdStrict();

    const planQ = await query<{ plan: Plan }>(`select plan from public.tenants where id=$1`, [tenantId]);
    const sitesQ = await query<{ cnt: number }>(`select count(*)::int as cnt from public.tenant_sites where tenant_id=$1`, [tenantId]);

    const plan = (planQ.rows[0]?.plan || 'none') as Plan;
    const current = Number(sitesQ.rows[0]?.cnt || 0);
    const limit = PLAN_LIMITS[plan]?.sites ?? 0;
    const remaining = Math.max(0, limit - current);
    const canAdd = remaining > 0;

    return (
        <SiteWizardButton canAdd={canAdd} remaining={remaining} />
    );
}
