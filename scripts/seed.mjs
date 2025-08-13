#!/usr/bin/env node
import 'dotenv/config'
import { Pool } from 'pg'
import crypto from 'node:crypto'

const {
    DATABASE_URL = '',
    OPENAI_API_KEY = '',
    OPENAI_EMBED_MODEL = 'text-embedding-3-small',
    SITE_URL = 'http://localhost:3001',
} = process.env

if (!DATABASE_URL) {
    console.error('DATABASE_URL required')
    process.exit(1)
}

const isLocal = DATABASE_URL.includes('127.0.0.1') || DATABASE_URL.includes('localhost') || DATABASE_URL.includes(':54322')
const pool = new Pool({ connectionString: DATABASE_URL, ssl: isLocal ? undefined : { rejectUnauthorized: false } })

function rid() { return crypto.randomUUID() }
function slugify(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'tenant' }

async function ensureTenant(client, id, name) {
    const t = await client.query('select id from public.tenants where id=$1', [id])
    if (t.rowCount) return id
    // detect if certain columns exist
    const slugCol = await client.query(
        `select 1 from information_schema.columns where table_schema='public' and table_name='tenants' and column_name='slug'`
    )
    const pkCol = await client.query(
        `select 1 from information_schema.columns where table_schema='public' and table_name='tenants' and column_name='public_key'`
    )
    const skCol = await client.query(
        `select 1 from information_schema.columns where table_schema='public' and table_name='tenants' and column_name='secret_key'`
    )
    const slug = slugify(name)
    const needsPK = pkCol.rowCount > 0
    const needsSK = skCol.rowCount > 0
    if (slugCol.rowCount) {
        // Try insert with present columns under a savepoint; on failure, rollback to savepoint and retry with alt slug
        await client.query('SAVEPOINT sp_tenant_insert')
        try {
            if (needsPK && needsSK) {
                const pub = 'hn_pk_' + crypto.randomBytes(18).toString('base64url')
                const sec = 'hn_sk_' + crypto.randomBytes(24).toString('base64url')
                await client.query(
                    `insert into public.tenants (id, name, slug, public_key, secret_key, plan, plan_status) values ($1,$2,$3,$4,$5,'starter','active')`,
                    [id, name, slug, pub, sec]
                )
            } else if (needsPK && !needsSK) {
                const pub = 'hn_pk_' + crypto.randomBytes(18).toString('base64url')
                await client.query(
                    `insert into public.tenants (id, name, slug, public_key, plan, plan_status) values ($1,$2,$3,$4,'starter','active')`,
                    [id, name, slug, pub]
                )
            } else if (!needsPK && needsSK) {
                const sec = 'hn_sk_' + crypto.randomBytes(24).toString('base64url')
                await client.query(
                    `insert into public.tenants (id, name, slug, secret_key, plan, plan_status) values ($1,$2,$3,$4,'starter','active')`,
                    [id, name, slug, sec]
                )
            } else {
                await client.query(`insert into public.tenants (id, name, slug, plan, plan_status) values ($1,$2,$3,'starter','active')`, [id, name, slug])
            }
        } catch {
            await client.query('ROLLBACK TO SAVEPOINT sp_tenant_insert')
            const alt = `${slug}-${Math.random().toString(36).slice(2, 6)}`
            if (needsPK && needsSK) {
                const pub = 'hn_pk_' + crypto.randomBytes(18).toString('base64url')
                const sec = 'hn_sk_' + crypto.randomBytes(24).toString('base64url')
                await client.query(
                    `insert into public.tenants (id, name, slug, public_key, secret_key, plan, plan_status) values ($1,$2,$3,$4,$5,'starter','active')`,
                    [id, name, alt, pub, sec]
                )
            } else if (needsPK && !needsSK) {
                const pub = 'hn_pk_' + crypto.randomBytes(18).toString('base64url')
                await client.query(
                    `insert into public.tenants (id, name, slug, public_key, plan, plan_status) values ($1,$2,$3,$4,'starter','active')`,
                    [id, name, alt, pub]
                )
            } else if (!needsPK && needsSK) {
                const sec = 'hn_sk_' + crypto.randomBytes(24).toString('base64url')
                await client.query(
                    `insert into public.tenants (id, name, slug, secret_key, plan, plan_status) values ($1,$2,$3,$4,'starter','active')`,
                    [id, name, alt, sec]
                )
            } else {
                await client.query(`insert into public.tenants (id, name, slug, plan, plan_status) values ($1,$2,$3,'starter','active')`, [id, name, alt])
            }
        }
    } else {
        // No slug column; still respect presence of public/secret key if required
        if (needsPK && needsSK) {
            const pub = 'hn_pk_' + crypto.randomBytes(18).toString('base64url')
            const sec = 'hn_sk_' + crypto.randomBytes(24).toString('base64url')
            await client.query(
                `insert into public.tenants (id, name, public_key, secret_key, plan, plan_status) values ($1,$2,$3,$4,'starter','active')`,
                [id, name, pub, sec]
            )
        } else if (needsPK && !needsSK) {
            const pub = 'hn_pk_' + crypto.randomBytes(18).toString('base64url')
            await client.query(
                `insert into public.tenants (id, name, public_key, plan, plan_status) values ($1,$2,$3,'starter','active')`,
                [id, name, pub]
            )
        } else if (!needsPK && needsSK) {
            const sec = 'hn_sk_' + crypto.randomBytes(24).toString('base64url')
            await client.query(
                `insert into public.tenants (id, name, secret_key, plan, plan_status) values ($1,$2,$3,'starter','active')`,
                [id, name, sec]
            )
        } else {
            await client.query(`insert into public.tenants (id, name, plan, plan_status) values ($1,$2,'starter','active')`, [id, name])
        }
    }
    await client.query(`insert into public.usage_counters (tenant_id, period_start, messages_count) values ($1, date_trunc('month', now())::date, 0) on conflict (tenant_id) do nothing`, [id])
    return id
}

async function upsertDocumentWithChunks(client, tenantId, url, title, content, embedder) {
    let docId
    const existing = await client.query(`select id from public.documents where tenant_id=$1 and url=$2 limit 1`, [tenantId, url])
    if (existing.rows[0]?.id) {
        docId = existing.rows[0].id
        await client.query(`update public.documents set title=$3, content=$4 where tenant_id=$1 and id=$2`, [tenantId, docId, title, content])
    } else {
        const doc = await client.query(`insert into public.documents (tenant_id, url, title, content) values ($1,$2,$3,$4) returning id`, [tenantId, url, title, content])
        docId = doc.rows[0].id
    }
    // naive chunker
    const parts = content.split(/\n\n+/).map(s => s.trim()).filter(Boolean).slice(0, 8)
    let embs = []
    if (embedder) {
        embs = await embedder(parts)
    } else {
        // fallback: fake vectors sized to schema (default 1536 or VECTOR_DIM)
        const dim = Number(process.env.VECTOR_DIM || '1536')
        embs = parts.map(() => Array(dim).fill(0))
    }
    // normalize dims to match VECTOR_DIM if provided
    const targetDim = Number(process.env.VECTOR_DIM || (embs[0]?.length || 1536))
    embs = embs.map(v => {
        if (!Array.isArray(v)) return Array(targetDim).fill(0)
        if (v.length === targetDim) return v
        if (v.length > targetDim) return v.slice(0, targetDim)
        const pad = Array(targetDim - v.length).fill(0)
        return v.concat(pad)
    })
    // Replace existing chunks for this document to keep seed idempotent
    await client.query(`delete from public.chunks where tenant_id=$1 and document_id=$2`, [tenantId, docId])
    // helper to turn JS array into pgvector input text: [v1,v2,...]
    const toVectorText = (arr) => '[' + arr.join(',') + ']'
    for (let i = 0; i < parts.length; i++) {
        const vecText = toVectorText(embs[i] || [])
        await client.query(
            `insert into public.chunks (tenant_id, document_id, url, content, token_count, embedding) values ($1,$2,$3,$4,$5,$6::vector)`,
            [tenantId, docId, url, parts[i], Math.ceil(parts[i].length / 4), vecText]
        )
    }
}

async function ensureConversation(client, tenantId, sessionId) {
    const c = await client.query(`select id from public.conversations where tenant_id=$1 and session_id=$2 limit 1`, [tenantId, sessionId])
    if (c.rows[0]?.id) return c.rows[0].id
    const ins = await client.query(`insert into public.conversations (tenant_id, session_id) values ($1,$2) returning id`, [tenantId, sessionId])
    return ins.rows[0].id
}

async function addSampleMessages(client, tenantId, conversationId) {
    await client.query(`insert into public.messages (conversation_id, tenant_id, role, content, confidence) values ($1,$2,'user',$3, null)`, [conversationId, tenantId, 'How do I install helpNINJA?'])
    await client.query(`insert into public.messages (conversation_id, tenant_id, role, content, confidence) values ($1,$2,'assistant',$3, 0.8)`, [conversationId, tenantId, 'Visit /docs to get started.'])
    await client.query(`update public.usage_counters set messages_count = messages_count + 1 where tenant_id=$1`, [tenantId])
}

async function main() {
    const tenantId = process.env.DEMO_TENANT_ID || process.env.NEXT_PUBLIC_DEMO_TENANT_ID || 'demo-tenant'
    const tenantName = 'Demo Tenant'
    const site = SITE_URL.replace(/\/$/, '')
    const homeUrl = site + '/docs'

    const client = await pool.connect()
    try {
        await client.query('begin')
        await ensureTenant(client, tenantId, tenantName)

        let embedder = null
        if (OPENAI_API_KEY) {
            const { default: OpenAI } = await import('openai')
            const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
            embedder = async (texts) => {
                const { data } = await openai.embeddings.create({ model: OPENAI_EMBED_MODEL, input: texts })
                return data.map(d => d.embedding)
            }
        }

        await upsertDocumentWithChunks(client, tenantId, homeUrl, 'helpNINJA Docs', `Welcome to helpNINJA.\n\n- Install via NPM.\n- Configure env vars.\n- Ingest your docs.\n- Embed the widget.\n\nNeed help? Contact support.`, embedder)

        const sessionId = rid().slice(0, 8)
        const conversationId = await ensureConversation(client, tenantId, sessionId)
        await addSampleMessages(client, tenantId, conversationId)

        // Optional: seed one active email integration using env fallback
        if (process.env.SUPPORT_FALLBACK_TO_EMAIL) {
            await client.query(
                `insert into public.integrations (tenant_id, provider, name, status, credentials, config)
                 values ($1,'email','Support email','active', '{}'::jsonb, jsonb_build_object('to', $2::text, 'from', $3::text))
                 on conflict do nothing`,
                [tenantId, process.env.SUPPORT_FALLBACK_TO_EMAIL, process.env.SUPPORT_FROM_EMAIL || 'no-reply@updates.helpninja.app']
            )
        }

        await client.query('commit')
        console.log('Seed complete for tenant:', tenantId)
    } catch (e) {
        await client.query('rollback')
        console.error('Seed failed:', e)
        process.exitCode = 1
    } finally {
        client.release()
        await pool.end()
    }
}

main().catch(err => { console.error(err); process.exit(1) })
