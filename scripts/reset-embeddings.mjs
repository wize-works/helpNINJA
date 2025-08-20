#!/usr/bin/env node

/**
 * Reset Embeddings Script
 * 
 * This script clears all existing document embeddings in the database
 * to ensure we can start fresh with a consistent embedding model.
 * 
 * Usage:
 * node scripts/reset-embeddings.mjs
 */

import pg from 'pg';
import { config } from 'dotenv';
import readline from 'readline';

// Load environment variables
config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
}

// Create a readline interface for user confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('⚠️  WARNING: This script will delete all document embeddings from the database.');
console.log('📝 Documents and chunks will remain, but their vector embeddings will be cleared.');
console.log('🔄 You will need to re-ingest your content to regenerate embeddings.');
console.log('');

rl.question('Are you sure you want to continue? (type "yes" to confirm): ', async (answer) => {
    if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Operation cancelled');
        rl.close();
        process.exit(0);
    }

    try {
        // Connect to the database
        console.log('🔌 Connecting to database...');
        const client = new pg.Client({ connectionString: dbUrl });
        await client.connect();

        // 1. First check how many records we'll be affecting
        console.log('🔍 Checking database...');

        const countResult = await client.query(`
      SELECT COUNT(*) as count FROM public.chunks WHERE embedding IS NOT NULL
    `);

        const count = parseInt(countResult.rows[0].count, 10);
        console.log(`📊 Found ${count} chunks with embeddings that will be cleared`);

        if (count === 0) {
            console.log('✅ No embeddings to clear. Your database is already empty.');
            await client.end();
            rl.close();
            process.exit(0);
        }

        // 2. Check embedding dimensions currently in use
        try {
            const dimResult = await client.query(`
        SELECT array_length(embedding, 1) as dimensions
        FROM public.chunks
        WHERE embedding IS NOT NULL
        LIMIT 1
      `);

            if (dimResult.rows.length > 0) {
                console.log(`📏 Current embedding dimensions: ${dimResult.rows[0].dimensions}`);
            }
        } catch (error) {
            console.log('⚠️  Could not determine current embedding dimensions:', error.message);
        }

        // 3. Final confirmation
        rl.question(`Confirm clearing ${count} embeddings? (type "yes" to confirm): `, async (finalAnswer) => {
            if (finalAnswer.toLowerCase() !== 'yes') {
                console.log('❌ Operation cancelled');
                await client.end();
                rl.close();
                process.exit(0);
            }

            // 4. Clear all embeddings
            console.log('🗑️  Clearing embeddings...');

            // Start a transaction
            await client.query('BEGIN');

            try {
                // Set all embeddings to NULL
                const result = await client.query(`
          UPDATE public.chunks SET embedding = NULL WHERE embedding IS NOT NULL
        `);

                console.log(`✅ Successfully cleared ${result.rowCount} embeddings`);

                // Commit the transaction
                await client.query('COMMIT');
            } catch (err) {
                // Rollback in case of error
                await client.query('ROLLBACK');
                console.error('❌ Error clearing embeddings:', err);
                process.exit(1);
            }

            console.log('');
            console.log('🔄 Next steps:');
            console.log('1. Make sure your OPENAI_EMBED_MODEL is set to "text-embedding-3-small" in .env');
            console.log('2. Re-ingest your documents using the API or dashboard');
            console.log('3. New embeddings will be consistent and use the text-embedding-3-small model');

            await client.end();
            rl.close();
            process.exit(0);
        });
    } catch (err) {
        console.error('❌ Database error:', err);
        rl.close();
        process.exit(1);
    }
});
