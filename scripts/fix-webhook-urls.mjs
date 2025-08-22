// Script to fix truncated webhook URLs in the database
// Usage: node scripts/fix-webhook-urls.mjs

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

async function fixWebhookUrls() {
    try {
        console.log('🔍 Looking for webhook endpoints with truncated URLs...');

        // Get all webhook endpoints
        const { rows: endpoints } = await pool.query(`
            SELECT id, url, tenant_id
            FROM public.webhook_endpoints
            WHERE url LIKE 'internal://integration/%'
        `);

        console.log(`Found ${endpoints.length} internal webhook endpoints`);

        // Check each endpoint and fix if needed
        for (const endpoint of endpoints) {
            const { id, url, tenant_id } = endpoint;
            console.log(`Checking webhook endpoint ${id}: ${url}`);

            // Check if URL is truncated by counting segments after 'internal://integration/'
            const parts = url.replace('internal://integration/', '').split('/');

            // If URL has format internal://integration/provider/id and id is truncated
            if (parts.length === 2) {
                const [provider, truncatedId] = parts;

                // Get all integrations for this tenant with this provider
                const { rows: integrations } = await pool.query(`
                    SELECT id, provider, name
                    FROM public.integrations
                    WHERE tenant_id = $1 AND provider = $2
                `, [tenant_id, provider]);

                if (integrations.length === 0) {
                    console.log(`⚠️ No ${provider} integrations found for tenant ${tenant_id}`);
                    continue;
                }

                // Find matching integration where id starts with truncatedId
                const matchingIntegration = integrations.find(i => i.id.startsWith(truncatedId));

                if (matchingIntegration) {
                    // Fix the truncated URL
                    const correctUrl = `internal://integration/${provider}/${matchingIntegration.id}`;

                    if (url !== correctUrl) {
                        console.log(`🔧 Fixing webhook URL: ${url} -> ${correctUrl}`);

                        // Update the webhook endpoint
                        await pool.query(`
                            UPDATE public.webhook_endpoints
                            SET url = $1, updated_at = NOW()
                            WHERE id = $2
                        `, [correctUrl, id]);

                        console.log(`✅ Fixed webhook endpoint ${id}`);
                    } else {
                        console.log(`✅ URL is already correct for webhook endpoint ${id}`);
                    }
                } else {
                    console.log(`⚠️ Could not find matching integration for truncated ID ${truncatedId}`);
                }
            } else {
                console.log(`✅ URL appears to be correctly formatted: ${url}`);
            }
        }

        console.log('🎉 Webhook URL check/fix completed successfully');
    } catch (error) {
        console.error('Error fixing webhook URLs:', error);
    } finally {
        pool.end();
    }
}

// Execute the function
fixWebhookUrls();
