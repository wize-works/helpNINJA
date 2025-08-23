import { EscalationEvent, IntegrationRecord } from './types'
import { getProvider } from './registry'
import { query } from '@/lib/db'

export async function loadDestinations(tenantId: string): Promise<IntegrationRecord[]> {
    const { rows } = await query<IntegrationRecord>('select * from public.integrations where tenant_id=$1 and status=' + "'active'", [tenantId])
    return rows
}

export async function dispatchEscalation(ev: EscalationEvent, destinations?: IntegrationRecord[]) {
    console.log(`📧 DISPATCH DEBUG [1]: dispatchEscalation called with event: ${JSON.stringify(ev)}`);

    // Check if the event has pre-configured destinations
    if (ev.destinations) {
        console.log(`📧 DISPATCH DEBUG [2]: Event contains destinations property with ${ev.destinations.length} entries`);
        console.log(`📧 DISPATCH DEBUG [2.1]: Destinations detail: ${JSON.stringify(ev.destinations)}`);

        const directDestinations: IntegrationRecord[] = [];
        const integrationIds: string[] = [];

        type DestinationItem =
            { integrationId: string } |
            { directEmail: string; provider: string } |
            { destination: { type: string; email?: string; integration_id?: string } };

        // Type guards for destination types
        function hasIntegrationId(d: DestinationItem): d is { integrationId: string } {
            return 'integrationId' in d && typeof d.integrationId === 'string';
        }

        function hasDirectEmail(d: DestinationItem): d is { directEmail: string; provider: string } {
            return 'directEmail' in d && typeof d.directEmail === 'string';
        }

        function hasDestination(d: DestinationItem): d is { destination: { type: string; email?: string; integration_id?: string } } {
            return 'destination' in d;
        }

        // Process all destination types
        ev.destinations.forEach((d) => {
            if (hasIntegrationId(d)) {
                // Standard integration reference
                integrationIds.push(d.integrationId);
                console.log(`📧 DISPATCH DEBUG [2.2]: Found integration ID: ${d.integrationId}`);
            }
            else if (hasDirectEmail(d)) {
                // Direct email for routing rules
                console.log(`📧 DISPATCH DEBUG [2.3]: Found direct email destination: ${d.directEmail}`);
                directDestinations.push({
                    id: `direct-email-${Math.random().toString(36).substring(2, 15)}`,
                    tenant_id: ev.tenantId,
                    provider: 'email',
                    name: 'Direct Email',
                    status: 'active',
                    credentials: {},
                    config: {
                        to: d.directEmail,
                        from: process.env.SUPPORT_FROM_EMAIL || 'support@helpninja.com'
                    }
                } as IntegrationRecord);
            }
            else if (hasDestination(d)) {
                // Handle other custom destination formats
                console.log(`📧 DISPATCH DEBUG [2.4]: Found custom destination: ${JSON.stringify(d.destination)}`);

                if (d.destination.type === 'email' && d.destination.email) {
                    directDestinations.push({
                        id: `direct-email-${Math.random().toString(36).substring(2, 15)}`,
                        tenant_id: ev.tenantId,
                        provider: 'email',
                        name: 'Direct Email',
                        status: 'active',
                        credentials: {},
                        config: {
                            to: d.destination.email,
                            from: process.env.SUPPORT_FROM_EMAIL || 'support@helpninja.com'
                        }
                    } as IntegrationRecord);
                }
            }
        });

        // Add any direct destinations we found
        if (directDestinations.length > 0) {
            console.log(`📧 DISPATCH DEBUG [2.4]: Adding ${directDestinations.length} direct destinations`);
            destinations = destinations || [];
            destinations.push(...directDestinations);
        }

        // Convert from shorthand format to full IntegrationRecord format
        try {
            console.log(`📧 DISPATCH DEBUG [3]: Converting destination shorthand to full records`);
            console.log(`📧 DISPATCH DEBUG [4]: Integration IDs: ${JSON.stringify(integrationIds)}`);

            if (integrationIds.length > 0) {
                const placeholders = integrationIds.map((_: string, i: number) => `$${i + 2}`).join(',');
                const { rows } = await query(
                    `SELECT * FROM public.integrations 
                     WHERE tenant_id = $1 
                     AND id IN (${placeholders})
                     AND status = 'active'`,
                    [ev.tenantId, ...integrationIds]
                );

                console.log(`📧 DISPATCH DEBUG [5]: Found ${rows.length} matching integrations in DB`);

                if (rows.length > 0) {
                    if (destinations) {
                        destinations.push(...rows as IntegrationRecord[]);
                    } else {
                        destinations = rows as IntegrationRecord[];
                    }
                    console.log(`📧 DISPATCH DEBUG [6]: Using ${destinations.length} integrations from event destinations`);
                }
            }
        } catch (error) {
            console.error(`📧 DISPATCH DEBUG [7]: Error processing event destinations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // If no valid destinations provided or found, load from tenant's active integrations
    const targets = destinations || await loadDestinations(ev.tenantId);
    console.log(`📧 DISPATCH DEBUG [8]: Target destinations: ${targets.length} records`);
    if (targets.length > 0) {
        console.log(`📧 DISPATCH DEBUG [9]: First target: id=${targets[0].id}, provider=${targets[0].provider}`);
    }

    // Set up fallback channels if no targets available
    const fallbacks: IntegrationRecord[] = [];
    if (!targets.length) {
        console.log(`📧 DISPATCH DEBUG [10]: No targets found, checking for fallbacks`);

        if (process.env.SUPPORT_FALLBACK_TO_EMAIL) {
            console.log(`📧 DISPATCH DEBUG [11]: Adding email fallback: ${process.env.SUPPORT_FALLBACK_TO_EMAIL}`);
            fallbacks.push({
                id: 'env-email',
                tenant_id: ev.tenantId,
                provider: 'email',
                name: 'env-email',
                status: 'active',
                credentials: {},
                config: {
                    to: process.env.SUPPORT_FALLBACK_TO_EMAIL,
                    from: process.env.SUPPORT_FROM_EMAIL
                }
            } as IntegrationRecord);
        } else {
            console.log(`📧 DISPATCH DEBUG [12]: No email fallback configured (SUPPORT_FALLBACK_TO_EMAIL missing)`);
        }

        if (process.env.SLACK_WEBHOOK_URL) {
            console.log(`📧 DISPATCH DEBUG [13]: Adding Slack fallback`);
            fallbacks.push({
                id: 'env-slack',
                tenant_id: ev.tenantId,
                provider: 'slack',
                name: 'env-slack',
                status: 'active',
                credentials: { webhook_url: process.env.SLACK_WEBHOOK_URL },
                config: {}
            } as IntegrationRecord);
        } else {
            console.log(`📧 DISPATCH DEBUG [14]: No Slack fallback configured (SLACK_WEBHOOK_URL missing)`);
        }
    }
    const list = targets.length ? targets : fallbacks
    console.log(`📧 DISPATCH DEBUG [15]: Final destination list: ${list.length} channels`);

    if (!list.length) {
        console.log(`📧 DISPATCH DEBUG [16]: No destinations configured or available`);
        return { ok: false, error: 'no destinations configured' };
    }

    console.log(`📧 DISPATCH DEBUG [17]: Dispatching to ${list.length} destinations: ${list.map(t => t.provider).join(', ')}`);

    const results = await Promise.all(list.map(async (t, idx) => {
        console.log(`📧 DISPATCH DEBUG [18.${idx}]: Dispatching to ${t.provider} (${t.id})`);
        const p = getProvider(t.provider);

        if (!p) {
            console.error(`📧 DISPATCH DEBUG [19.${idx}]: Provider not registered: ${t.provider}`);
            return { provider: t.provider, ok: false, error: 'provider_not_registered', integrationId: t.id };
        }

        console.log(`📧 DISPATCH DEBUG [20.${idx}]: Provider found, sending escalation`);
        const r = await p.sendEscalation(ev, t);

        console.log(`📧 DISPATCH DEBUG [21.${idx}]: Provider ${t.provider} result: ${JSON.stringify(r)}`);

        if (!r.ok) {
            console.log(`📧 DISPATCH DEBUG [22.${idx}]: Adding to outbox for retry: ${t.provider} (${t.id})`);
            await query(
                'insert into public.integration_outbox (tenant_id, provider, integration_id, payload, status, attempts, next_attempt_at, last_error) values ($1,$2,$3,$4,\'pending\',0, now() + interval \'2 minutes\', $5)',
                [ev.tenantId, t.provider, t.id, ev, r.error || 'unknown']
            );
        } else {
            console.log(`📧 DISPATCH DEBUG [23.${idx}]: Provider ${t.provider} succeeded`);
        }

        // Include the integration ID in the result for dashboard visibility
        return { provider: t.provider, integrationId: t.id, ...r };
    }));

    const successful = results.filter(r => r.ok).length;
    console.log(`📧 DISPATCH DEBUG [24]: Dispatch complete: ${successful}/${results.length} successful`);

    return { ok: results.some(r => r.ok), results }
}
