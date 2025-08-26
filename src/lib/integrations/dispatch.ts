import { EscalationEvent, IntegrationRecord } from './types'
import { getProvider } from './registry'
import { query } from '@/lib/db'

export async function loadDestinations(tenantId: string): Promise<IntegrationRecord[]> {
    const { rows } = await query<IntegrationRecord>('select * from public.integrations where tenant_id=$1 and status=' + "'active'", [tenantId])
    return rows
}

export async function dispatchEscalation(ev: EscalationEvent, destinations?: IntegrationRecord[]) {
    // dispatchEscalation invoked

    // Check if the event has pre-configured destinations
    if (ev.destinations) {
        // Event contains destinations property

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
                // Found integration ID
            }
            else if (hasDirectEmail(d)) {
                // Direct email for routing rules
                // Found direct email destination
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
                // Found custom destination

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
            // Adding direct destinations
            destinations = destinations || [];
            destinations.push(...directDestinations);
        }

        // Convert from shorthand format to full IntegrationRecord format
        try {
            // Converting destination shorthand to full records

            if (integrationIds.length > 0) {
                const placeholders = integrationIds.map((_: string, i: number) => `$${i + 2}`).join(',');
                const { rows } = await query(
                    `SELECT * FROM public.integrations 
                     WHERE tenant_id = $1 
                     AND id IN (${placeholders})
                     AND status = 'active'`,
                    [ev.tenantId, ...integrationIds]
                );

                // Found matching integrations in DB

                if (rows.length > 0) {
                    if (destinations) {
                        destinations.push(...rows as IntegrationRecord[]);
                    } else {
                        destinations = rows as IntegrationRecord[];
                    }
                    // Using integrations from event destinations
                }
            }
        } catch (error) {
            console.error(`📧 DISPATCH DEBUG [7]: Error processing event destinations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // If no valid destinations provided or found, load from tenant's active integrations
    const targets = destinations || await loadDestinations(ev.tenantId);
    // Target destinations count
    if (targets.length > 0) {
        // First target info removed
    }

    // Set up fallback channels if no targets available
    const fallbacks: IntegrationRecord[] = [];
    if (!targets.length) {
        // No targets found, checking for fallbacks

        if (process.env.SUPPORT_FALLBACK_TO_EMAIL) {
            // Adding email fallback
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
            // No email fallback configured
        }

        if (process.env.SLACK_WEBHOOK_URL) {
            // Adding Slack fallback
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
            // No Slack fallback configured
        }
    }
    const list = targets.length ? targets : fallbacks
    // Final destination list length

    if (!list.length) {
        // No destinations configured or available
        return { ok: false, error: 'no destinations configured' };
    }

    // Dispatching to destinations

    const results = await Promise.all(list.map(async (t) => {
        // Dispatching to provider
        const p = getProvider(t.provider);

        if (!p) {
            console.error(`Provider not registered: ${t.provider}`);
            return { provider: t.provider, ok: false, error: 'provider_not_registered', integrationId: t.id };
        }

        // Provider found, sending escalation
        const r = await p.sendEscalation(ev, t);

        // Provider result

        if (!r.ok) {
            // Adding to outbox for retry
            await query(
                'insert into public.integration_outbox (tenant_id, provider, integration_id, payload, status, attempts, next_attempt_at, last_error) values ($1,$2,$3,$4,\'pending\',0, now() + interval \'2 minutes\', $5)',
                [ev.tenantId, t.provider, t.id, ev, r.error || 'unknown']
            );
        } else {
            // Provider succeeded
        }

        // Include the integration ID in the result for dashboard visibility
        return { provider: t.provider, integrationId: t.id, ...r };
    }));

    // Dispatch complete summary removed

    return { ok: results.some(r => r.ok), results }
}
