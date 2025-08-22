// Script to check email integration configuration
// Usage: node scripts/check-email-config.mjs

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load environment variables from .env file in the root directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL environment variable is not set. Please set it and try again.');
    process.exit(1);
}

// Create a connection pool
const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('.supabase.co') ? { rejectUnauthorized: false } : false
});

async function checkEmailConfiguration() {
    try {
        console.log('🔍 Checking email integration configuration...');
        console.log('Environment variables:');
        console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set'}`);
        console.log(`SUPPORT_FROM_EMAIL: ${process.env.SUPPORT_FROM_EMAIL ? '✅ Set' : '❌ Not set'}`);
        console.log(`SUPPORT_FALLBACK_TO_EMAIL: ${process.env.SUPPORT_FALLBACK_TO_EMAIL ? '✅ Set' : '❌ Not set'}`);

        // Check integration registry module
        console.log('\n🔍 Checking integration registry...');
        try {
            const { getProvider } = await import('../src/lib/integrations/registry.js');
            const emailProvider = getProvider('email');
            console.log(`Email provider registered: ${emailProvider ? '✅ Yes' : '❌ No'}`);
        } catch (error) {
            console.error('Error importing integration registry:', error);
        }

        // Check database for integrations
        const { rows: integrations } = await pool.query(`
            SELECT id, tenant_id, provider, name, config, status 
            FROM public.integrations 
            WHERE provider = 'email'
        `);

        console.log(`\n📧 Found ${integrations.length} email integrations in database`);

        for (const integration of integrations) {
            console.log(`\nIntegration ID: ${integration.id}`);
            console.log(`Tenant ID: ${integration.tenant_id}`);
            console.log(`Name: ${integration.name}`);
            console.log(`Status: ${integration.status}`);
            console.log(`Config: ${JSON.stringify(integration.config, null, 2)}`);

            // Check if this integration has webhook endpoints
            const { rows: webhooks } = await pool.query(`
                SELECT id, url, events, is_active
                FROM public.webhook_endpoints
                WHERE url LIKE $1
            `, [`internal://integration/email/${integration.id}%`]);

            console.log(`Webhook endpoints: ${webhooks.length}`);

            for (const webhook of webhooks) {
                console.log(`  - ID: ${webhook.id}`);
                console.log(`    URL: ${webhook.url}`);
                console.log(`    Active: ${webhook.is_active ? '✅ Yes' : '❌ No'}`);
                console.log(`    Events: ${webhook.events.join(', ')}`);

                // Check if URL is correct
                const expectedUrl = `internal://integration/email/${integration.id}`;
                if (webhook.url !== expectedUrl) {
                    console.log(`    ⚠️ URL mismatch! Expected: ${expectedUrl}`);
                }
            }

            // Check for escalation rules using this integration
            const { rows: rules } = await pool.query(`
                SELECT id, name, destinations::jsonb
                FROM public.escalation_rules
                WHERE tenant_id = $1 AND destinations::text LIKE '%"email"%'
            `, [integration.tenant_id]);

            console.log(`\nEscalation rules: ${rules.length}`);

            for (const rule of rules) {
                console.log(`  - ID: ${rule.id}`);
                console.log(`    Name: ${rule.name}`);

                // Check if rule destinations include this integration
                const destinations = rule.destinations || [];
                const hasEmailDestination = destinations.some(d =>
                    d.type === 'email' && (d.integration_id === integration.id || d.email)
                );

                console.log(`    Has email destination: ${hasEmailDestination ? '✅ Yes' : '❌ No'}`);
                console.log(`    Destinations: ${JSON.stringify(destinations, null, 2)}`);
            }
        }

        console.log('\n🔍 Checking for integration outbox entries...');
        const { rows: outbox } = await pool.query(`
            SELECT id, tenant_id, integration_id, status, payload, created_at, attempts, last_error
            FROM public.integration_outbox
            WHERE integration_id IN (SELECT id FROM public.integrations WHERE provider = 'email')
            ORDER BY created_at DESC
            LIMIT 10
        `);

        console.log(`Found ${outbox.length} recent email outbox entries`);

        for (const entry of outbox) {
            console.log(`\nOutbox ID: ${entry.id}`);
            console.log(`Tenant ID: ${entry.tenant_id}`);
            console.log(`Integration ID: ${entry.integration_id}`);
            console.log(`Status: ${entry.status}`);
            console.log(`Created: ${entry.created_at}`);
            console.log(`Attempts: ${entry.attempts}`);

            if (entry.last_error) {
                console.log(`Error: ${entry.last_error}`);
            }

            console.log(`Payload: ${JSON.stringify(entry.payload, null, 2)}`);
        }

        console.log('\n✅ Email integration check completed');

    } catch (error) {
        console.error('Error checking email configuration:', error);
    } finally {
        pool.end();
    }
}

// Execute the function
checkEmailConfiguration();
