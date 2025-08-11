import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedBatch(texts: string[]) {
    const { data } = await openai.embeddings.create({
        model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
        input: texts,
    });
    return data.map(d => d.embedding);
}

export async function embedQuery(text: string) {
    const { data } = await openai.embeddings.create({
        model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
        input: [text],
    });
    return data[0].embedding;
}
