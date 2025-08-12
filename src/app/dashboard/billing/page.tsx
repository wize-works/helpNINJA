'use client';
import { useState } from 'react';
import { useTenant } from '@/components/tenant-context';
import { Breadcrumb } from '@/components/ui/breadcrumb';

const PLANS = [
    { key: 'starter', name: 'Starter', price: '$29/mo', features: ['1 site', '1k messages', 'Email handoff'] },
    { key: 'pro', name: 'Pro', price: '$79/mo', features: ['3 sites', '5k messages', 'Slack handoff', 'Analytics'] },
    { key: 'agency', name: 'Agency', price: '$249/mo', features: ['10 sites', '20k messages', 'White-label', 'Multi-client'] },
] as const;

export default function BillingPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const { tenantId } = useTenant();

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Billing", icon: "fa-credit-card" }
    ];

    async function checkout(plan: string) {
        setLoading(plan);
        const r = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId || '' }, body: JSON.stringify({ plan }) });
        const j = await r.json();
        setLoading(null);
        if (j.url) window.location.href = j.url; else alert(j.error || 'Error creating checkout');
    }

    async function portal() {
        const r = await fetch('/api/billing/portal', { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId || '' } });
        const j = await r.json();
        if (j.url) window.location.href = j.url; else alert(j.error || 'Error');
    }

    return (
        <div className="p-6 space-y-6">
            <Breadcrumb items={breadcrumbItems} />
            <h1 className="text-2xl font-bold">Billing</h1>
            <div className="grid md:grid-cols-3 gap-4">
                {PLANS.map(p => (
                    <div key={p.key} className="border rounded-2xl p-5 flex flex-col">
                        <div className="text-xl font-semibold">{p.name}</div>
                        <div className="text-3xl mt-2">{p.price}</div>
                        <ul className="mt-3 text-sm text-gray-600 space-y-1">
                            {p.features.map(f => <li key={f}>• {f}</li>)}
                        </ul>
                        <button onClick={() => checkout(p.key)} disabled={loading === p.key} className="mt-4 btn btn-primary">
                            {loading === p.key ? 'Loading…' : 'Choose ' + p.name}
                        </button>
                    </div>
                ))}
            </div>
            <div>
                <button onClick={portal} className="btn">Manage subscription</button>
            </div>
        </div>
    );
}