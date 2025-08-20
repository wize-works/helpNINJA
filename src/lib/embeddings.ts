import OpenAI from 'openai';
// Removed unused import: query

// Always use the model specified in environment or text-embedding-ada-002 by default
// This ensures consistency with existing data that appears to use 3072-dimension vectors
const EMBEDDING_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = EMBEDDING_MODEL.includes('ada-002') ? 3072 : 1536;

console.log(`📊 Using embedding model: ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS} dimensions)`);

// Function to determine which embedding model to use
async function determineEmbeddingModel(): Promise<{ model: string, dimensions: number }> {
    // Always return the configured model
    return {
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS
    };
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
