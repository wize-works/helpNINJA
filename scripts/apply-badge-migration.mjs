#!/usr/bin/env node

/**
 * Migration Script: Apply Sidebar Badge Tables
 * 
 * This script applies the sidebar badge table migration to ensure
 * all required tables exist for the notification system.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import database connection (adjust path as needed)
let query;
try {
    const dbModule = await import('../src/lib/db.js');
    query = dbModule.query;
} catch (error) {
    console.error('❌ Could not import database module:', error.message);
    console.log('💡 Make sure to build the project first: npm run build');
    process.exit(1);
}

async function applyMigration() {
    try {
        console.log('🚀 Starting sidebar badge table migration...\n');

        // Read the migration SQL file
        const migrationPath = join(__dirname, '..', 'sql', '090_sidebar_badge_tables.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');

        console.log('📁 Migration file loaded:', migrationPath);
        console.log('📋 Applying migration to database...\n');

        // Execute the migration
        await query(migrationSQL);

        console.log('✅ Migration completed successfully!\n');

        // Verify tables exist
        console.log('🔍 Verifying tables...');
        const verificationSQL = `
            SELECT 
                tablename,
                hasindexes,
                hastriggers
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('crawl_attempts', 'page_failures', 'feedback', 'integrations', 'integration_outbox')
            ORDER BY tablename;
        `;

        const { rows } = await query(verificationSQL);

        console.log('\n📊 Table Status:');
        console.table(rows);

        if (rows.length >= 3) {
            console.log('\n🎉 SUCCESS: All required badge tables are available!');
            console.log('\n🔗 Next steps:');
            console.log('   1. Test the badge API: GET /api/sidebar/badges');
            console.log('   2. Check the sidebar for notification counts');
            console.log('   3. Monitor logs for any remaining issues');
        } else {
            console.log('\n⚠️  WARNING: Some tables may still be missing');
            console.log('   Expected at least 3 tables, found:', rows.length);
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);

        if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log('\n💡 This error suggests a dependency table is missing.');
            console.log('   Make sure your main schema has been applied first.');
            console.log('   Check that tables like "tenants" and "tenant_sites" exist.');
        }

        if (error.message.includes('permission denied')) {
            console.log('\n💡 This error suggests insufficient database permissions.');
            console.log('   Make sure your database user has CREATE and INSERT privileges.');
        }

        console.log('\n📋 For more help, see: docs/sidebar-badge-migration.md');
        process.exit(1);
    }
}

// Check if this is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('📱 Sidebar Badge Table Migration Script');
    console.log('=====================================\n');

    applyMigration().catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}

export default applyMigration;