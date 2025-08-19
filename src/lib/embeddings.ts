import OpenAI from 'openai';

export async function embedBatch(texts: string[]) {
    // Filter out empty or whitespace-only texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);

    if (validTexts.length === 0) {
        throw new Error('No valid text content to embed');
    }

    // Initialize OpenAI only when needed at runtime
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { data } = await openai.embeddings.create({
        model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
        input: validTexts,
    });
    return data.map(d => d.embedding);
}

export async function embedQuery(text: string) {
    // Initialize OpenAI only when needed at runtime
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { data } = await openai.embeddings.create({
        model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
        input: [text],
    });
    return data[0].embedding;
}
