import OpenAI from 'openai';
import { query } from './db';

// Cache for embedding dimensions to avoid repeated DB checks
let cachedEmbeddingDimension: number | null = null;

// Function to determine which embedding model to use based on existing data
async function determineEmbeddingModel(): Promise<{ model: string, dimensions: number }> {
    // If we have a cached dimension, use it
    if (cachedEmbeddingDimension !== null) {
        // Use the appropriate model based on dimensions
        if (cachedEmbeddingDimension === 3072) {
            return { model: 'text-embedding-ada-002', dimensions: 3072 };
        } else {
            return { model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small', dimensions: 1536 };
        }
    }

    try {
        // Check if we have any existing embeddings in the database
        const result = await query(`
            SELECT octet_length(embedding) / 4 as dimensions
            FROM public.chunks
            WHERE embedding IS NOT NULL
            LIMIT 1
        `);

        if (result.rows.length > 0) {
            // We found existing embeddings, use their dimension
            const dimensions = parseInt(result.rows[0].dimensions);
            cachedEmbeddingDimension = dimensions;

            console.log(`Using existing embedding dimensions: ${dimensions}`);

            if (dimensions === 3072) {
                return { model: 'text-embedding-ada-002', dimensions };
            } else {
                return { model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small', dimensions };
            }
        } else {
            // No existing embeddings, use the configured model or default
            const model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
            const dimensions = model.includes('ada-002') ? 3072 : 1536;
            cachedEmbeddingDimension = dimensions;

            console.log(`No existing embeddings, using model: ${model} with dimensions: ${dimensions}`);

            return { model, dimensions };
        }
    } catch (error) {
        // If there's an error checking the database, fall back to the configured model
        console.error('Error checking existing embedding dimensions:', error);
        const model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
        const dimensions = model.includes('ada-002') ? 3072 : 1536;
        return { model, dimensions };
    }
}

export async function embedBatch(texts: string[]) {
    // Filter out empty or whitespace-only texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);

    if (validTexts.length === 0) {
        throw new Error('No valid text content to embed');
    }

    // Get the appropriate embedding model based on existing data
    const { model } = await determineEmbeddingModel();

    // Initialize OpenAI only when needed at runtime
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log(`Using embedding model: ${model} for batch of ${validTexts.length} texts`);

    const { data } = await openai.embeddings.create({
        model,
        input: validTexts,
    });
    return data.map(d => d.embedding);
}

export async function embedQuery(text: string) {
    // Get the appropriate embedding model based on existing data
    const { model } = await determineEmbeddingModel();

    // Initialize OpenAI only when needed at runtime
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log(`Using embedding model: ${model} for query`);

    const { data } = await openai.embeddings.create({
        model,
        input: [text],
    });
    return data[0].embedding;
}
