import OutboxRetryButton from "@/components/outbox-retry-button";
import { query } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/limits";
import { getTenantIdServer } from "@/lib/auth";

export const runtime = "nodejs"; // ensure Node runtime for pg

type StatRow = {
    conversations: number;
    messages_this_month: number;
    low_conf: number;
    integrations_active: number;
    escalations_pending: number;
    documents: number;
    chunks: number;
};

type IntegrationRow = { id: string; provider: string; name: string; status: string };

async function getStats(tenantId: string) {
    const statsQ = await query<StatRow>(
        `select
            (select count(*) from public.conversations where tenant_id=$1)::int as conversations,
            (select messages_count from public.usage_counters where tenant_id=$1)::int as messages_this_month,
            (select count(*) from public.messages where tenant_id=$1 and role='assistant' and confidence < 0.55 and created_at >= date_trunc('month', now()))::int as low_conf,
            (select count(*) from public.integrations where tenant_id=$1 and status='active')::int as integrations_active,
            (select count(*) from public.integration_outbox where tenant_id=$1 and status='pending')::int as escalations_pending,
            (select count(*) from public.documents where tenant_id=$1)::int as documents,
            (select count(*) from public.chunks where tenant_id=$1)::int as chunks
        `,
        [tenantId]
    );
    const planQ = await query<{ plan: keyof typeof PLAN_LIMITS }>(
        `select plan from public.tenants where id=$1`,
        [tenantId]
    );
    const integrationsQ = await query<IntegrationRow>(
        `select id, provider, name, status from public.integrations where tenant_id=$1 order by created_at desc limit 5`,
        [tenantId]
    );

    const defaultStats: StatRow = { conversations: 0, messages_this_month: 0, low_conf: 0, integrations_active: 0, escalations_pending: 0, documents: 0, chunks: 0 };
    const stats = statsQ.rows[0] || defaultStats;
    const plan = (planQ.rows[0]?.plan || "starter") as keyof typeof PLAN_LIMITS;
    const limit = PLAN_LIMITS[plan].messages;
    return {
        stats: {
            conversations: Number(stats.conversations || 0),
            messages_this_month: Number(stats.messages_this_month || 0),
            low_conf: Number(stats.low_conf || 0),
            integrations_active: Number(stats.integrations_active || 0),
            escalations_pending: Number(stats.escalations_pending || 0),
            documents: Number(stats.documents || 0),
            chunks: Number(stats.chunks || 0),
        },
        plan,
        limit,
        integrations: integrationsQ.rows,
    } as const;
}

export default async function Dashboard() {
    // Use shared resolver; headers/cookies/env are sufficient. Passing searchParams is optional.
    const tenantId = await getTenantIdServer({ allowEnvFallback: true });

    // Graceful fallback if DB is unavailable
    let statsData: { stats: StatRow; plan: keyof typeof PLAN_LIMITS; limit: number; integrations: IntegrationRow[] };
    try {
        statsData = await getStats(tenantId);
    } catch (err) {
        console.error("Dashboard stats error", err);
        statsData = {
            stats: { conversations: 0, messages_this_month: 0, low_conf: 0, integrations_active: 0, escalations_pending: 0, documents: 0, chunks: 0 },
            plan: "starter",
            limit: PLAN_LIMITS.starter.messages,
            integrations: [],
        };
    }

    const { stats, plan, limit, integrations } = statsData;
    const usedPct = limit ? Math.min(100, Math.round((stats.messages_this_month / limit) * 100)) : 0;
    const lowConfRate = stats.messages_this_month ? Math.round((stats.low_conf / stats.messages_this_month) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <div className="flex items-center gap-2">
                    <span className="badge badge-outline">Plan: {plan}</span>
                    <a href={`/dashboard/billing`} className="btn btn-primary btn-sm">
                        <i className="fa-duotone fa-solid fa-arrow-up-right-from-square mr-2" aria-hidden />
                        Manage Billing
                    </a>
                </div>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon="fa-comments" title="Conversations" value={num(stats.conversations)} />
                <UsageCard used={stats.messages_this_month} limit={limit} />
                <StatCard icon="fa-triangle-exclamation" title="Low-confidence rate" value={`${lowConfRate}%`} delta={stats.low_conf ? `${stats.low_conf} msgs` : undefined} negative={lowConfRate > 25} />
                <StatCard icon="fa-puzzle-piece" title="Active integrations" value={num(stats.integrations_active)} delta={stats.escalations_pending ? `${stats.escalations_pending} pending` : undefined} negative={Boolean(stats.escalations_pending)} />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="card bg-base-100 border border-base-300 lg:col-span-2">
                    <div className="card-body">
                        <div className="flex items-center justify-between">
                            <h3 className="card-title">Chat volume (last 30 days)</h3>
                            <div className="join">
                                <button className="btn btn-sm join-item">Filter</button>
                                <button className="btn btn-sm join-item">Export</button>
                            </div>
                        </div>
                        <div className="mt-4 grid h-52 place-items-center rounded-xl bg-base-200/60 border border-dashed border-base-300">
                            <span className="text-base-content/60 text-sm">Chart placeholder</span>
                        </div>
                    </div>
                </div>
                <div className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                        <h3 className="card-title">Sources indexed</h3>
                        <div className="mt-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Documents</span>
                                <span className="font-medium">{num(stats.documents)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span>Chunks</span>
                                <span className="font-medium">{num(stats.chunks)}</span>
                            </div>
                            <div className="mt-4 grid h-40 place-items-center rounded-xl bg-base-200/60 border border-dashed border-base-300">
                                <span className="text-base-content/60 text-sm">Bar chart placeholder</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="card bg-base-100 border border-base-300">
                    <div className="card-body">
                        <div className="flex items-center justify-between">
                            <h3 className="card-title">Integrations</h3>
                            <a className="link link-primary text-sm" href="/dashboard/integrations">See all</a>
                        </div>
                        <div className="mt-3 divide-y divide-base-300">
                            {integrations.length === 0 && (
                                <div className="py-4 text-sm opacity-70">No integrations yet. Connect Slack or Email.</div>
                            )}
                            {integrations.map((row) => (
                                <div key={row.id} className="flex items-center justify-between py-3">
                                    <div className="flex items-center gap-3">
                                        <i className={`fa-duotone fa-solid ${providerIcon(row.provider)} text-xl`} aria-hidden />
                                        <div>
                                            <div className="font-medium">{row.name}</div>
                                            <div className="text-xs opacity-60">{row.provider}</div>
                                        </div>
                                    </div>
                                    <div className={`badge ${row.status === 'active' ? 'badge-success' : ''}`}>{row.status}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between rounded-lg bg-base-200/50 border border-dashed border-base-300 p-3">
                            <div className="text-sm">
                                <div className="font-medium">Integrations health</div>
                                <div className="opacity-70">{stats.escalations_pending} pending in outbox</div>
                            </div>
                            <OutboxRetryButton />
                        </div>
                    </div>
                </div>
                <div className="card bg-base-100 border border-base-300 lg:col-span-2">
                    <div className="card-body">
                        <div className="flex items-center justify-between">
                            <h3 className="card-title">Usage this month</h3>
                            <span className="text-sm opacity-70">{stats.messages_this_month} / {limit} messages</span>
                        </div>
                        <progress className="progress progress-primary w-full" value={usedPct} max={100}></progress>
                        <div className="mt-2 text-xs opacity-60">Low-confidence: {stats.low_conf} messages</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, title, value, delta, negative }: { icon: string; title: string; value: string | number; delta?: string; negative?: boolean }) {
    return (
        <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
                <div className="flex items-center gap-3">
                    <div className="btn btn-ghost btn-circle no-animation pointer-events-none">
                        <i className={`fa-duotone fa-solid ${icon}`} aria-hidden />
                    </div>
                    <div className="text-sm opacity-70">{title}</div>
                </div>
                <div className="mt-2 flex items-end justify-between">
                    <div className="text-2xl font-bold">{value}</div>
                    {delta && (
                        <div className={`badge ${negative ? "badge-error" : "badge-success"}`}>{delta}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function UsageCard({ used, limit }: { used: number; limit: number }) {
    const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    return (
        <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
                <div className="flex items-center gap-3">
                    <div className="btn btn-ghost btn-circle no-animation pointer-events-none">
                        <i className="fa-duotone fa-solid fa-message" aria-hidden />
                    </div>
                    <div className="text-sm opacity-70">Messages (this month)</div>
                </div>
                <div className="mt-2">
                    <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold">{num(used)}<span className="text-base opacity-60">/{num(limit)}</span></div>
                        <div className={`badge ${pct > 90 ? 'badge-error' : pct > 70 ? 'badge-warning' : 'badge-success'}`}>{pct}%</div>
                    </div>
                    <progress className="progress progress-primary w-full mt-2" value={pct} max={100}></progress>
                </div>
            </div>
        </div>
    );
}

function num(n: number) { return new Intl.NumberFormat().format(n); }

function providerIcon(key: string) {
    switch (key) {
        case 'slack': return 'fa-slack';
        case 'email': return 'fa-envelope';
        default: return 'fa-puzzle-piece';
    }
}