#!/usr/bin/env node

/**
 * Embedding Model Migration Script
 * 
 * This script migrates from text-embedding-3-large (3072 dims) to text-embedding-3-small (1536 dims)
 * It will:
 * 1. Update the database schema to use vector(1536)
 * 2. Delete all existing chunks (due to NOT NULL constraint)
 * 3. Re-ingest all existing documents to regenerate embeddings
 * 
 * Usage:
 * OPENAI_EMBED_MODEL=text-embedding-3-small node scripts/migrate-embedding-model.mjs
 */

import pg from 'pg';
import { config } from 'dotenv';
import readline from 'readline';
import OpenAI from 'openai';

// Load environment variables
config();

const dbUrl = process.env.DATABASE_URL;
const openaiKey = process.env.OPENAI_API_KEY;
const newModel = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
}

if (!openaiKey) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    process.exit(1);
}

// Get dimensions for the new model
function getModelDimensions(model) {
    if (model.includes('3-small')) return 1536;
    if (model.includes('3-large')) return 3072;
    if (model.includes('ada-002')) return 1536;
    return 1536; // default
}

const newDimensions = getModelDimensions(newModel);

// Create a readline interface for user confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔄 helpNINJA Embedding Model Migration');
console.log('=====================================');
console.log('');
console.log(`Target model: ${newModel} (${newDimensions} dimensions)`);
console.log('');
console.log('⚠️  This will:');
console.log('1. Delete ALL existing chunks with embeddings');
console.log('2. Update database schema to new vector dimensions');
console.log('3. Re-ingest ALL documents to regenerate embeddings');
console.log('4. This process may take several minutes depending on content volume');
console.log('');
console.log('💡 Make sure OPENAI_EMBED_MODEL is set to your target model in .env');
console.log('');

rl.question('Are you sure you want to continue? (type "MIGRATE" to confirm): ', async (answer) => {
    if (answer !== 'MIGRATE') {
        console.log('❌ Migration cancelled');
        rl.close();
        process.exit(0);
    }

    try {
        // Connect to the database
        console.log('🔌 Connecting to database...');
        const client = new pg.Client({ connectionString: dbUrl });
        await client.connect();

        // Initialize OpenAI for re-ingestion
        const openai = new OpenAI({ apiKey: openaiKey });

        console.log('🔍 Analyzing current state...');

        // Check current schema dimensions
        const schemaCheck = await client.query(`
            SELECT atttypmod as dim
            FROM pg_attribute
            WHERE attrelid = 'public.chunks'::regclass
            AND attname = 'embedding'
        `);

        const currentDims = schemaCheck.rows[0]?.dim || 0;
        console.log(`📏 Current schema dimensions: ${currentDims}`);
        console.log(`📏 Target dimensions: ${newDimensions}`);

        // Check existing chunks count
        const countResult = await client.query(`
            SELECT COUNT(*) as count FROM public.chunks WHERE embedding IS NOT NULL
        `);
        const chunkCount = parseInt(countResult.rows[0].count, 10);
        console.log(`📊 Found ${chunkCount} chunks with embeddings`);

        // Get all documents that need re-ingestion
        const docsResult = await client.query(`
            SELECT DISTINCT d.id, d.tenant_id, d.url, d.title, d.content, d.site_id
            FROM public.documents d
            INNER JOIN public.chunks c ON c.document_id = d.id
            WHERE c.embedding IS NOT NULL
            ORDER BY d.tenant_id, d.created_at
        `);

        const documentsToReprocess = docsResult.rows;
        console.log(`📄 Found ${documentsToReprocess.length} documents to reprocess`);

        // Start transaction
        console.log('🔄 Starting migration...');
        await client.query('BEGIN');

        try {
            // Step 1: Delete all chunks with embeddings
            console.log('🗑️  Deleting existing chunks...');
            const deleteResult = await client.query(`
                DELETE FROM public.chunks WHERE embedding IS NOT NULL
            `);
            console.log(`✅ Deleted ${deleteResult.rowCount} chunks`);

            // Step 2: Update schema if needed
            if (currentDims !== newDimensions) {
                console.log(`🔧 Updating schema to vector(${newDimensions})...`);

                // Drop existing index
                await client.query('DROP INDEX IF EXISTS chunks_vec_idx');

                // Alter column type
                await client.query(`ALTER TABLE public.chunks ALTER COLUMN embedding TYPE vector(${newDimensions})`);

                // Recreate index
                await client.query(`
                    CREATE INDEX chunks_vec_idx 
                    ON public.chunks 
                    USING ivfflat (embedding vector_cosine_ops) 
                    WITH (lists = 100)
                `);

                console.log('✅ Schema updated successfully');
            } else {
                console.log('✅ Schema dimensions already correct');
            }

            // Commit schema changes
            await client.query('COMMIT');
            console.log('✅ Schema migration completed');

            // Step 3: Re-ingest documents
            console.log('🔄 Starting document re-ingestion...');
            let processed = 0;
            let failed = 0;

            for (const doc of documentsToReprocess) {
                try {
                    console.log(`📝 Processing [${processed + 1}/${documentsToReprocess.length}]: ${doc.title}`);

                    // Generate chunks
                    const chunks = chunkText(doc.content);
                    const validChunks = chunks.filter(chunk => chunk && chunk.trim().length > 0);

                    if (validChunks.length === 0) {
                        console.log('⚠️  No valid chunks, skipping');
                        continue;
                    }

                    // Generate embeddings in batches to avoid API limits
                    const batchSize = 10;
                    const embeddings = [];

                    for (let i = 0; i < validChunks.length; i += batchSize) {
                        const batch = validChunks.slice(i, i + batchSize);
                        const { data } = await openai.embeddings.create({
                            model: newModel,
                            input: batch,
                        });
                        embeddings.push(...data.map(d => d.embedding));
                    }

                    // Insert new chunks
                    for (let i = 0; i < validChunks.length; i++) {
                        const embedding = embeddings[i];
                        const vectorText = `[${embedding.join(',')}]`;

                        await client.query(`
                            INSERT INTO public.chunks 
                            (tenant_id, document_id, url, content, token_count, embedding, site_id)
                            VALUES ($1, $2, $3, $4, $5, $6::vector, $7)
                        `, [
                            doc.tenant_id,
                            doc.id,
                            doc.url,
                            validChunks[i],
                            Math.ceil(validChunks[i].length / 4),
                            vectorText,
                            doc.site_id
                        ]);
                    }

                    processed++;
                    console.log(`✅ Processed: ${validChunks.length} chunks generated`);

                    // Small delay to avoid overwhelming OpenAI API
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    console.error(`❌ Failed to process ${doc.title}:`, error.message);
                    failed++;
                }
            }

            console.log('');
            console.log('🎉 Migration completed!');
            console.log(`✅ Documents processed: ${processed}`);
            console.log(`❌ Documents failed: ${failed}`);
            console.log(`📊 New embedding model: ${newModel} (${newDimensions} dimensions)`);
            console.log('');
            console.log('💡 Next steps:');
            console.log('1. Verify the chat widget is working correctly');
            console.log('2. Test search functionality');
            console.log('3. Monitor memory usage (should be ~50% lower)');

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }

        await client.end();
        rl.close();

    } catch (error) {
        console.error('❌ Database connection error:', error);
        rl.close();
        process.exit(1);
    }
});

// Helper function - simplified chunker
function chunkText(text, target = 900) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let buf = [];

    for (const s of sentences) {
        const tentative = [...buf, s].join(' ');
        if (tentative.length > target && buf.length) {
            chunks.push(buf.join(' '));
            buf = [s];
        } else {
            buf.push(s);
        }
    }

    if (buf.length) chunks.push(buf.join(' '));
    return chunks.filter(c => c.trim().length > 0);
}