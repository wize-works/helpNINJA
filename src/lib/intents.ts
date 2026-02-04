// src/lib/intents.ts
import OpenAI from 'openai';

export type IntentKey =
    | 'features' | 'pricing' | 'what_is' | 'integrations'
    | 'troubleshoot' | 'sales' | 'smalltalk' | 'other';

type IntentDef = { key: IntentKey; desc: string };

const INTENTS: IntentDef[] = [
    { key: 'features', desc: 'User asks about product capabilities or top features.' },
    { key: 'pricing', desc: 'User asks about plans, price, trial, billing, or costs.' },
    { key: 'what_is', desc: 'User asks what the product is or its core value.' },
    { key: 'integrations', desc: 'User asks about Slack, Email, Teams, or third-party tools.' },
    { key: 'troubleshoot', desc: 'User reports a problem or asks how to fix something.' },
    { key: 'sales', desc: 'User wants a demo, contact sales, enterprise, or ROI.' },
    { key: 'smalltalk', desc: 'Greetings or chit-chat not requiring product info.' },
    { key: 'other', desc: 'Everything else.' }
];

let intentMatrix: { key: IntentKey; vec: number[] }[] | null = null;

async function embed(openai: OpenAI, text: string) {
    const r = await openai.embeddings.create({
        model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
        input: text
    });
    return r.data[0].embedding;
}

function cosine(a: number[], b: number[]) {
    if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
        console.warn('[INTENT] cosine: Invalid input vectors', { aLen: a?.length, bLen: b?.length });
        return 0;
    }

    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        if (!isFinite(a[i]) || !isFinite(b[i])) {
            console.warn('[INTENT] cosine: Non-finite values detected', { i, aVal: a[i], bVal: b[i] });
            continue;
        }
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }

    const denom = Math.sqrt(na) * Math.sqrt(nb) + 1e-12;
    const result = dot / denom;
    if (!isFinite(result)) {
        console.error('[INTENT] cosine: Result is not finite', { dot, na, nb, denom, result });
        return 0;
    }
    return result;
}

export async function ensureIntentEmbeddings(openai: OpenAI) {
    if (intentMatrix) return;
    const vecs = await Promise.all(INTENTS.map(i => embed(openai, i.desc)));
    intentMatrix = INTENTS.map((i, idx) => ({ key: i.key, vec: vecs[idx] }));
}

export async function classifyIntent(openai: OpenAI, userText: string) {
    await ensureIntentEmbeddings(openai);
    const q = await embed(openai, userText);
    let best: { key: IntentKey; score: number } = { key: 'other', score: -1 };
    let runnerUp = -1;

    for (const row of intentMatrix!) {
        const s = cosine(q, row.vec);
        if (s > best.score) { runnerUp = best.score; best = { key: row.key, score: s }; }
        else if (s > runnerUp) runnerUp = s;
    }

    const margin = best.score - (runnerUp < 0 ? 0 : runnerUp);
    const lowConfidence = best.score < 0.35 || margin < 0.05;
    return { intent: lowConfidence ? 'other' as IntentKey : best.key, score: best.score, margin };
}
