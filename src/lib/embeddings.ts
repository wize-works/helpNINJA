import OpenAI from 'openai';
import { query } from './db';

// Choose embedding model. Default to a small, inexpensive model unless overridden.
// NOTE: Existing schema defines public.chunks.embedding as vector(3072). To avoid
// dimension mismatch errors (which silently drop inserts in the crawl due to try/catch),
// set OPENAI_EMBED_MODEL to 'text-embedding-3-large' (3072 dims) or run a migration to
// ALTER TABLE to vector(1536) if you prefer 'text-embedding-3-small'.
const EMBEDDING_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

function inferDims(model: string): number {
    // Known 3072-dimension models
    if (/ada-002|3-large/i.test(model)) return 3072;
    // Known 1536-dimension models (text-embedding-3-small, etc.)
    return 1536;
}

const EMBEDDING_DIMENSIONS = inferDims(EMBEDDING_MODEL);

let SCHEMA_EMBEDDING_DIMENSIONS: number | null = null;
let DIM_CHECK_PROMISE: Promise<void> | null = null;

async function loadSchemaVectorDims() {
    if (SCHEMA_EMBEDDING_DIMENSIONS !== null) return; // already loaded
    // pgvector stores the dimension directly in atttypmod (no +4 adjustment needed)
    const sql = `select atttypmod as dim
                                     from pg_attribute
                                    where attrelid = 'public.chunks'::regclass
                                        and attname = 'embedding'`;
    try {
        const { rows } = await query<{ dim: number }>(sql, []);
        if (rows.length && rows[0].dim) {
            SCHEMA_EMBEDDING_DIMENSIONS = rows[0].dim;
            if (SCHEMA_EMBEDDING_DIMENSIONS !== EMBEDDING_DIMENSIONS) {
                if (SCHEMA_EMBEDDING_DIMENSIONS !== 1536 && SCHEMA_EMBEDDING_DIMENSIONS !== 3072) {
                    console.error(
                        `🚫 Unexpected embedding column dimension ${SCHEMA_EMBEDDING_DIMENSIONS}. Supported sizes are 1536 (text-embedding-3-small) or 3072 (text-embedding-3-large / ada-002). ` +
                        `Table likely altered with a typo. Because table is currently empty (or should be before fixing), run one of:\n` +
                        `  ALTER TABLE public.chunks ALTER COLUMN embedding TYPE vector(1536);  -- if keeping ${EMBEDDING_MODEL}\n` +
                        `  ALTER TABLE public.chunks ALTER COLUMN embedding TYPE vector(3072);  -- if switching to text-embedding-3-large\n` +
                        `Then retry ingestion.`
                    );
                } else {
                    console.error(
                        `⚠️ Embedding dimension mismatch: table has ${SCHEMA_EMBEDDING_DIMENSIONS}, model ${EMBEDDING_MODEL} provides ${EMBEDDING_DIMENSIONS}. ` +
                        `Set OPENAI_EMBED_MODEL to a ${SCHEMA_EMBEDDING_DIMENSIONS}-dim model (${SCHEMA_EMBEDDING_DIMENSIONS === 3072 ? 'text-embedding-3-large' : 'text-embedding-3-small'}) ` +
                        `OR run: ALTER TABLE public.chunks ALTER COLUMN embedding TYPE vector(${EMBEDDING_DIMENSIONS});`
                    );
                }
            } else {
                // Embedding dimensions aligned (debug log removed)
            }
        } else {
            console.warn('Could not determine embedding column dimension; proceeding without check.');
        }
    } catch (e) {
        console.warn('Failed to load schema embedding dimension (this may happen in migration steps):', e);
    }
}

async function ensureDimsOk() {
    if (!DIM_CHECK_PROMISE) DIM_CHECK_PROMISE = loadSchemaVectorDims();
    await DIM_CHECK_PROMISE;
    if (SCHEMA_EMBEDDING_DIMENSIONS && SCHEMA_EMBEDDING_DIMENSIONS !== EMBEDDING_DIMENSIONS) {
        const schemaDim = SCHEMA_EMBEDDING_DIMENSIONS;
        const targetDim = EMBEDDING_DIMENSIONS;
        // Pure detection – no DDL here. Surface a precise actionable error.
        const schemaValid = schemaDim === 1536 || schemaDim === 3072;
        if (!schemaValid) {
            throw new Error(
                `Invalid embedding column dimension ${schemaDim}. Supported: 1536 or 3072. ` +
                `Since table is empty you can safely fix with (choose one):\n` +
                `  -- Standardize on text-embedding-3-small (recommended for cost)\n` +
                `  DROP INDEX IF EXISTS chunks_vec_idx;\n  ALTER TABLE public.chunks ALTER COLUMN embedding TYPE vector(${targetDim});\n  CREATE INDEX chunks_vec_idx ON public.chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);\n` +
                `If you instead want 3072 dims, set OPENAI_EMBED_MODEL=text-embedding-3-large and alter to vector(3072).`
            );
        } else {
            throw new Error(
                `Embedding dimension mismatch: schema=${schemaDim}, model=${targetDim}. ` +
                `Align by either (a) switching OPENAI_EMBED_MODEL or (b) altering the column & rebuilding index. No automatic change performed.`
            );
        }
    }
}

// Using embedding model: ${EMBEDDING_MODEL} (log removed)

// Function to determine which embedding model to use
async function determineEmbeddingModel(): Promise<{ model: string, dimensions: number }> {
    // Always return the configured model
    return {
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS
    };
}

export async function embedBatch(texts: string[]) {
    await ensureDimsOk();
    // Filter out empty or whitespace-only texts
    const validTexts = texts.filter(text => text && typeof text === 'string' && text.trim().length > 0);

    if (validTexts.length === 0) {
        throw new Error('No valid text content to embed');
    }

    // Get the appropriate embedding model based on existing data
    const { model } = await determineEmbeddingModel();

    // Initialize OpenAI only when needed at runtime
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Embedding batch (${validTexts.length}) with model ${model} (debug log removed)

    const { data } = await openai.embeddings.create({
        model,
        input: validTexts,
    });

    const embeddings = data.map(d => d.embedding);

    // Validate all embeddings contain no NaN or infinite values
    for (let i = 0; i < embeddings.length; i++) {
        const embedding = embeddings[i];
        if (!Array.isArray(embedding) || embedding.some(val => !isFinite(val))) {
            throw new Error(`Invalid embedding at index ${i} - contains NaN or infinite values`);
        }
    }

    return embeddings;
}

export async function embedQuery(text: string) {
    await ensureDimsOk();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.error('[EMBED] embedQuery: Invalid text input', { text: typeof text });
        throw new Error('Invalid text input for embedding');
    }

    // Get the appropriate embedding model based on existing data
    const { model } = await determineEmbeddingModel();

    try {
        // Initialize OpenAI only when needed at runtime
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // Embedding query with model ${model} (debug log removed)

        const { data } = await openai.embeddings.create({
            model,
            input: [text],
        });

        const embedding = data[0].embedding;

        // Validate embedding contains no NaN or infinite values
        if (!Array.isArray(embedding) || embedding.some(val => !isFinite(val))) {
            console.error('[EMBED] embedQuery: Invalid embedding from OpenAI', {
                model,
                textLength: text.length,
                embeddingLength: embedding?.length,
                firstNonFinite: embedding?.findIndex(val => !isFinite(val))
            });
            throw new Error('Invalid embedding returned from OpenAI - contains NaN or infinite values');
        }

        return embedding;
    } catch (error) {
        console.error('[EMBED] embedQuery: Failed to generate embedding', {
            model,
            textLength: text.length,
            error: error instanceof Error ? error.message : error
        });
        throw error;
    }
}
