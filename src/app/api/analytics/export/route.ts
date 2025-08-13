import { NextRequest, NextResponse } from 'next/server';
import { getTenantIdServer } from '@/lib/auth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type ExportType = 'conversations' | 'messages' | 'integrations' | 'webhooks' | 'all';
type ExportFormat = 'csv' | 'json';

type ExportData = Record<string, unknown>[] | Record<string, Record<string, unknown>[]>;

function convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Escape CSV values that contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

async function getConversationsData(tenantId: string, siteId?: string, days: number = 30) {
    // Note: Site filtering is not currently supported for conversations as they 
    // don't have direct site associations in the current schema
    const { rows } = await query(`
        SELECT 
            c.id,
            c.session_id,
            c.created_at,
            COUNT(m.id) as message_count,
            COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_messages,
            COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as assistant_messages,
            AVG(CASE WHEN m.confidence IS NOT NULL THEN m.confidence END) as avg_confidence,
            BOOL_OR(m.confidence < 0.55) as was_escalated
        FROM public.conversations c
        LEFT JOIN public.messages m ON m.conversation_id = c.id
        WHERE c.tenant_id = $1 
            AND c.created_at >= NOW() - INTERVAL '1 day' * $2
        GROUP BY c.id, c.session_id, c.created_at
        ORDER BY c.created_at DESC
    `, [tenantId, days]);

    return rows;
}

async function getMessagesData(tenantId: string, siteId?: string, days: number = 30) {
    // Note: Site filtering is not currently supported for messages as conversations 
    // don't have direct site associations in the current schema
    const { rows } = await query(`
        SELECT 
            m.id,
            m.conversation_id,
            c.session_id,
            m.role,
            m.content,
            m.confidence,
            m.created_at
        FROM public.messages m
        JOIN public.conversations c ON c.id = m.conversation_id
        WHERE m.tenant_id = $1 
            AND m.created_at >= NOW() - INTERVAL '1 day' * $2
        ORDER BY m.created_at DESC
    `, [tenantId, days]);

    return rows;
}

async function getIntegrationsData(tenantId: string, days: number = 30) {
    const { rows } = await query(`
        SELECT 
            i.id,
            i.name,
            i.provider,
            i.status,
            i.created_at,
            COUNT(io.id) as total_deliveries,
            COUNT(CASE WHEN io.status = 'sent' THEN 1 END) as successful_deliveries,
            COUNT(CASE WHEN io.status = 'failed' THEN 1 END) as failed_deliveries,
            0 as avg_response_time,
            MAX(io.sent_at) as last_delivery
        FROM public.integrations i
        LEFT JOIN public.integration_outbox io ON io.integration_id = i.id 
            AND io.created_at >= NOW() - INTERVAL '1 day' * $2
        WHERE i.tenant_id = $1
        GROUP BY i.id, i.name, i.provider, i.status, i.created_at
        ORDER BY i.name
    `, [tenantId, days]);

    return rows;
}

async function getWebhooksData(tenantId: string, days: number = 30) {
    const { rows } = await query(`
        SELECT 
            wd.id,
            we.name as webhook_name,
            we.url as webhook_url,
            wd.event_type,
            CASE 
                WHEN wd.delivered_at IS NOT NULL THEN 'delivered'
                WHEN wd.failed_at IS NOT NULL THEN 'failed'
                ELSE 'pending'
            END as status,
            wd.delivery_attempts as attempt_count,
            wd.created_at,
            wd.delivered_at,
            wd.failed_at,
            wd.response_status,
            wd.response_body as error_message,
            EXTRACT(EPOCH FROM (wd.delivered_at - wd.created_at)) as response_time
        FROM public.webhook_deliveries wd
        JOIN public.webhook_endpoints we ON we.id = wd.webhook_endpoint_id
        WHERE we.tenant_id = $1 
            AND wd.created_at >= NOW() - INTERVAL '1 day' * $2
        ORDER BY wd.created_at DESC
    `, [tenantId, days]);

    return rows;
}

export async function GET(request: NextRequest) {
    try {
        const tenantId = await getTenantIdServer({ allowEnvFallback: true });
        const url = new URL(request.url);

        const exportType = (url.searchParams.get('type') || 'conversations') as ExportType;
        const exportFormat = (url.searchParams.get('format') || 'csv') as ExportFormat;
        const timeframe = url.searchParams.get('timeframe') || '30d';
        const siteId = url.searchParams.get('site') || undefined;

        // Calculate days
        let days = 30;
        switch (timeframe) {
            case '1d': days = 1; break;
            case '7d': days = 7; break;
            case '30d': days = 30; break;
            case '90d': days = 90; break;
        }

        let data: Record<string, unknown>[] | Record<string, Record<string, unknown>[]> = [];
        const filename = `analytics-${exportType}-${timeframe}`;

        // Fetch data based on export type
        switch (exportType) {
            case 'conversations':
                data = await getConversationsData(tenantId, siteId, days);
                break;
            case 'messages':
                data = await getMessagesData(tenantId, siteId, days);
                break;
            case 'integrations':
                data = await getIntegrationsData(tenantId, days);
                break;
            case 'webhooks':
                data = await getWebhooksData(tenantId, days);
                break;
            case 'all':
                const [conversations, messages, integrations, webhooks] = await Promise.all([
                    getConversationsData(tenantId, siteId, days),
                    getMessagesData(tenantId, siteId, days),
                    getIntegrationsData(tenantId, days),
                    getWebhooksData(tenantId, days)
                ]);
                data = {
                    conversations,
                    messages,
                    integrations,
                    webhooks
                };
                break;
        }

        // Format and return data
        if (exportFormat === 'csv') {
            let csvContent: string;

            if (exportType === 'all' && !Array.isArray(data)) {
                // For 'all', create separate CSV sections
                const sections = Object.entries(data as Record<string, Record<string, unknown>[]>);
                csvContent = sections.map(([section, sectionData]) => {
                    return `=== ${section.toUpperCase()} ===\n${convertToCSV(sectionData)}\n`;
                }).join('\n');
            } else {
                csvContent = convertToCSV(data as Record<string, unknown>[]);
            }

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${filename}.csv"`
                }
            });
        } else {
            // JSON format
            const jsonContent = JSON.stringify(data, null, 2);
            return new NextResponse(jsonContent, {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="${filename}.json"`
                }
            });
        }

    } catch (error) {
        console.error('Analytics export error:', error);
        return NextResponse.json(
            { error: 'Failed to export analytics data' },
            { status: 500 }
        );
    }
}
