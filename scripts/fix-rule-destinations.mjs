// Script to fix escalation rule destinations
// Usage: node scripts/fix-rule-destinations.mjs

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

async function fixRuleDestinations() {
    try {
        console.log('🔍 Looking for escalation rules with invalid destinations...');

        // Get all escalation rules
        const { rows: rules } = await pool.query(`
            SELECT id, tenant_id, name, destinations::jsonb as destinations
            FROM public.escalation_rules
            WHERE enabled = true
        `);

        console.log(`Found ${rules.length} active escalation rules`);

        for (const rule of rules) {
            console.log(`\nChecking rule: ${rule.name} (${rule.id})`);

            const destinations = rule.destinations || [];
            let needsUpdate = false;
            const updatedDestinations = [];

            for (const dest of destinations) {
                console.log(`- Destination: ${JSON.stringify(dest)}`);

                if (dest.type === 'email') {
                    if (!dest.email && !dest.integration_id) {
                        console.log('  ⚠️ Email destination has neither email nor integration_id');

                        // Get email integrations for this tenant
                        const { rows: integrations } = await pool.query(`
                            SELECT id, name, config
                            FROM public.integrations
                            WHERE tenant_id = $1 AND provider = 'email' AND status = 'active'
                            LIMIT 1
                        `, [rule.tenant_id]);

                        if (integrations.length > 0) {
                            const integration = integrations[0];
                            console.log(`  🔧 Found email integration: ${integration.name} (${integration.id})`);

                            // Update destination with integration_id
                            dest.integration_id = integration.id;
                            needsUpdate = true;
                        } else {
                            // If no integration exists, use env fallback
                            if (process.env.SUPPORT_FALLBACK_TO_EMAIL) {
                                console.log(`  🔧 No integration found, using fallback email: ${process.env.SUPPORT_FALLBACK_TO_EMAIL}`);
                                dest.email = process.env.SUPPORT_FALLBACK_TO_EMAIL;
                                needsUpdate = true;
                            } else {
                                console.log('  ❌ No email integration and no fallback email configured');
                            }
                        }
                    }
                }

                updatedDestinations.push(dest);
            }

            // If we have simple email destinations without an integration_id, add destinations pointing to integrations
            if (!destinations.some(d => d.type === 'email' && d.integration_id)) {
                // Get email integrations for this tenant
                const { rows: integrations } = await pool.query(`
                    SELECT id, name
                    FROM public.integrations
                    WHERE tenant_id = $1 AND provider = 'email' AND status = 'active'
                `, [rule.tenant_id]);

                for (const integration of integrations) {
                    console.log(`  ➕ Adding email integration: ${integration.name} (${integration.id})`);
                    updatedDestinations.push({
                        type: 'email',
                        integration_id: integration.id
                    });
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                console.log('  🔄 Updating rule destinations');

                // Update the rule
                await pool.query(`
                    UPDATE public.escalation_rules
                    SET destinations = $1::jsonb, updated_at = NOW()
                    WHERE id = $2
                `, [JSON.stringify(updatedDestinations), rule.id]);

                console.log('  ✅ Rule updated');
            } else {
                console.log('  ✅ Rule destinations are valid, no updates needed');
            }
        }

        console.log('\n🎉 Rule destination check/fix completed successfully');
    } catch (error) {
        console.error('Error fixing rule destinations:', error);
    } finally {
        pool.end();
    }
}

// Execute the function
fixRuleDestinations();
