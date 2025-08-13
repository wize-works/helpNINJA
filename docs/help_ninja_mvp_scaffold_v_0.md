# helpNINJA — MVP Scaffold v0.1

A 2‑minute, AI‑powered website support agent. Crawl → index → answer → escalate.

---

## 0) Repo structure

```text
helpninja/
├─ app/
│  ├─ (dashboard)/
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ api/
│  │  ├─ ingest/route.ts
│  │  ├─ chat/route.ts
│  │  ├─ widget/route.ts   # serves tenant-specific widget JS
│  │  └─ stripe/webhook/route.ts
│  ├─ layout.tsx
│  └─ page.tsx             # marketing landing
├─ components/
│  ├─ ChatPreview.tsx
│  ├─ DashboardNav.tsx
│  └─ ThemeToggle.tsx
├─ lib/
│  ├─ db.ts                # pg client (Supabase Postgres)
│  ├─ supabase.ts          # server & client helpers
│  ├─ crawler.ts           # sitemap/URL ingestion
│  ├─ chunk.ts             # text chunking
│  ├─ embeddings.ts        # OpenAI embeddings
│  ├─ rag.ts               # hybrid search (FTS + vector)
│  ├─ auth.ts              # org/tenant helpers
│  ├─ stripe.ts            # Stripe helpers
│  └─ email.ts             # Resend helpers
├─ public/
│  └─ logo.svg
├─ prisma/ (optional)
├─ sql/
│  ├─ 001_extensions.sql
│  ├─ 010_schema.sql
│  ├─ 020_rls.sql
│  └─ 030_indexes.sql
├─ styles/
│  └─ globals.css
├─ .env.example
├─ Dockerfile
├─ docker-compose.yml (dev)
├─ next.config.ts
├─ package.json
├─ postcss.config.js
├─ tailwind.config.ts
└─ tsconfig.json
```

---

## 1) env

```bash
# .env.example
# Next/Auth
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_me

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_EMBED_MODEL=text-embedding-3-large
OPENAI_CHAT_MODEL=gpt-4o-mini

# Stripe
STRIPE_SECRET_KEY=sk_live_or_test
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...

# Resend
RESEND_API_KEY=re_...

# Sentry (optional)
SENTRY_DSN=
```

---

## 2) Postgres schema (Supabase)

> Run `sql/*.sql` in order. Uses `pgvector` and Postgres FTS.

```sql
-- sql/001_extensions.sql
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists rum;
```

```sql
-- sql/010_schema.sql
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  public_key text unique not null,
  secret_key text unique not null,
  plan text not null default 'starter',
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text not null default 'member',
  primary key (tenant_id, user_id)
);

-- Content sources (web pages, PDFs, manual answers)
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('url', 'sitemap', 'pdf', 'manual')),
  url text,
  title text,
  status text not null default 'ready',
  last_crawled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  url text,
  title text,
  content text not null,
  lang text default 'en',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Chunked embeddings
create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  url text,
  content text not null,
  token_count int not null,
  embedding vector(3072) not null
);

-- Chat + analytics
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id text not null,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  confidence numeric,
  created_at timestamptz not null default now()
);

create table public.events (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  data jsonb,
  created_at timestamptz not null default now()
);

-- Answer overrides / pinned answers
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  question text not null,
  answer text not null,
  tags text[] default '{}',
  updated_at timestamptz not null default now()
);

-- Usage tracking
create table public.usage_counters (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  period_start date not null,
  messages_count int not null default 0,
  last_reset timestamptz not null default now()
);

-- Simple FTS on documents
alter table public.documents add column if not exists tsv tsvector;
update public.documents set tsv = to_tsvector('english', coalesce(title,'') || ' ' || content);
create index if not exists documents_tsv_idx on public.documents using gin (tsv);
```

```sql
-- sql/020_rls.sql
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.tenant_members enable row level security;
alter table public.sources enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;
alter table public.answers enable row level security;
alter table public.usage_counters enable row level security;

-- Policies: members can access rows for their tenant; service role bypasses.
create policy tenant_members_select on public.tenant_members
for select using (true);

create policy tenant_data_select on public.documents
for select using (exists (
  select 1 from public.tenant_members tm
  where tm.tenant_id = documents.tenant_id and tm.user_id = auth.uid()
));

create policy tenant_data_mod on public.documents
for all using (exists (
  select 1 from public.tenant_members tm
  where tm.tenant_id = documents.tenant_id and tm.user_id = auth.uid()
));

-- Repeat similar policies for sources, chunks, conversations, messages, answers, events, usage_counters.
```

```sql
-- sql/030_indexes.sql
create index if not exists chunks_tenant_idx on public.chunks(tenant_id);
create index if not exists chunks_doc_idx on public.chunks(document_id);
create index if not exists chunks_vec_idx on public.chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists messages_conv_idx on public.messages(conversation_id);
```

---

## 3) Package.json (essential deps)

```json
{
  "name": "helpninja",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "@supabase/supabase-js": "2.45.4",
    "pg": "8.12.0",
    "ai": "3.0.22",
    "zod": "3.23.8",
    "stripe": "16.8.0",
    "xml2js": "0.6.2",
    "linkedom": "0.18.4",
    "@resend/node": "2.5.0",
    "uuid": "9.0.1",
    "@vercel/analytics": "1.2.2",
    "@vercel/speed-insights": "1.0.12",
    "@upstash/ratelimit": "1.0.0",
    "ioredis": "5.4.1"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "tailwindcss": "3.4.7",
    "postcss": "8.4.41",
    "autoprefixer": "10.4.19"
  }
}
```

---

## 4) DB client & Supabase helpers

```ts
// lib/db.ts
import { Pool } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function query<T=any>(text: string, params?: any[]): Promise<{ rows: T[] }>{
  const client = await pool.connect();
  try { return await client.query(text, params); }
  finally { client.release(); }
}
```

```ts
// lib/supabase.ts (server helper)
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

---

## 5) Crawler (URL / sitemap)

```ts
// lib/crawler.ts
import { parseStringPromise } from 'xml2js';
import { JSDOM } from 'linkedom';

export type CrawledDoc = { url: string; title?: string; content: string };

export async function crawl(input: string, maxPages = 40): Promise<CrawledDoc[]> {
  if (input.endsWith('sitemap.xml')) return crawlSitemap(input, maxPages);
  try {
    const res = await fetch(input, { redirect: 'follow' });
    const html = await res.text();
    const doc = extractFromHtml(input, html);
    return [doc];
  } catch { return []; }
}

async function crawlSitemap(url: string, maxPages: number): Promise<CrawledDoc[]> {
  const res = await fetch(url);
  const xml = await res.text();
  const parsed = await parseStringPromise(xml);
  const urls: string[] = (parsed.urlset?.url ?? []).map((u: any) => u.loc[0]).slice(0, maxPages);
  const out: CrawledDoc[] = [];
  for (const u of urls) {
    try {
      const r = await fetch(u, { redirect: 'follow' });
      const html = await r.text();
      out.push(extractFromHtml(u, html));
    } catch {}
  }
  return out;
}

function extractFromHtml(url: string, html: string): CrawledDoc {
  const { document } = new JSDOM(html).window as any;
  const title = document.querySelector('title')?.textContent ?? url;
  // remove nav/footer/scripts
  document.querySelectorAll('script,style,noscript,header,footer,nav').forEach((n: any) => n.remove());
  const content = document.body?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return { url, title, content };
}
```

---

## 6) Chunking

```ts
// lib/chunk.ts
export function chunkText(text: string, target = 900): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let buf: string[] = [];
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
```

---

## 7) Embeddings

```ts
// lib/embeddings.ts
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedBatch(texts: string[]) {
  const { data } = await openai.embeddings.create({
    model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-large',
    input: texts,
  });
  return data.map(d => d.embedding);
}
```

---

## 8) Hybrid search (RAG)

```ts
// lib/rag.ts
import { query } from './db';

export async function searchHybrid(tenantId: string, q: string, k = 8) {
  // 1) lexical FTS
  const { rows: lex } = await query<{document_id: string, url: string, title: string, content: string}>(
    `select d.id as document_id, d.url, d.title, d.content
     from public.documents d
     where d.tenant_id = $1 and d.tsv @@ plainto_tsquery('english', $2)
     limit 20`, [tenantId, q]
  );

  // 2) vector
  const { rows: vec } = await query<{id: string, url: string, content: string}>(
    `with emb as (
       select embedding($2::text) as e
     )
     select c.id, c.url, c.content
     from public.chunks c, emb
     where c.tenant_id = $1
     order by c.embedding <=> emb.e
     limit $3`, [tenantId, q, k]
  );

  // naive merge: prefer vec, append unique lex docs
  const seen = new Set<string>();
  const merged = [...vec, ...lex.filter(l => { const u = l.url; if (seen.has(u)) return false; seen.add(u); return true; })];
  return merged.slice(0, k);
}
```

> **Note**: The SQL uses a helper `embedding(text)` function bound in Postgres (e.g., via an extension or a PL/pgSQL function that calls your embeddings service). In early MVP you can do vector search purely in app code: compute query embedding with OpenAI and pass as `$2::vector` directly.

Example for direct vector param:

```ts
// compute qe = await openai.embeddings.create(...); then
await query(`select id,url,content from public.chunks
  where tenant_id=$1 order by embedding <=> $2 limit $3`, [tenantId, qe.data[0].embedding, k]);
```

---

## 9) API — ingest

```ts
// app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { crawl } from '@/lib/crawler';
import { chunkText } from '@/lib/chunk';
import { embedBatch } from '@/lib/embeddings';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { tenantId, input } = await req.json();
  if (!tenantId || !input) return NextResponse.json({ error: 'tenantId and input required' }, { status: 400 });

  const docs = await crawl(input);
  for (const d of docs) {
    const ins = await query<{ id: string }>(
      `insert into public.documents (tenant_id, url, title, content)
       values ($1,$2,$3,$4) returning id`, [tenantId, d.url, d.title, d.content]
    );
    const docId = (ins.rows[0] as any).id;
    const chunks = chunkText(d.content);
    const embs = await embedBatch(chunks);
    for (let i = 0; i < chunks.length; i++) {
      await query(
        `insert into public.chunks (tenant_id, document_id, url, content, token_count, embedding)
         values ($1,$2,$3,$4,$5,$6)`, [tenantId, docId, d.url, chunks[i], Math.ceil(chunks[i].length/4), embs[i]]
      );
    }
  }
  return NextResponse.json({ ok: true, docs: docs.length });
}
```

---

## 10) API — chat (RAG + guardrails)

```ts
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchHybrid } from '@/lib/rag';
import { query } from '@/lib/db';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const runtime = 'nodejs';

const SYSTEM = (voice = 'friendly') => `You are helpNINJA, a concise, helpful site assistant.
Use only the provided Context to answer. If unsure, say you don’t know and offer to connect support.
Voice: ${voice}. Keep answers under 120 words. Include 1 link to the relevant page if useful.`;

export async function POST(req: NextRequest) {
  const { tenantId, sessionId, message, voice } = await req.json();
  if (!tenantId || !sessionId || !message) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

  const contexts = await searchHybrid(tenantId, message, 6);
  const contextText = contexts.map((c: any, i: number) => `[[${i+1}]] ${c.url}\n${c.content}`).join('\n\n');

  const chat = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM(voice) },
      { role: 'user', content: `Question: ${message}\n\nContext:\n${contextText}` }
    ]
  });

  const text = chat.choices[0]?.message?.content?.trim() || "I’m not sure. Want me to connect you with support?";
  const confidence = chat.choices[0]?.finish_reason === 'stop' ? 0.7 : 0.4;

  await query(`insert into public.messages (conversation_id, tenant_id, role, content, confidence)
               values ((select id from public.conversations where tenant_id=$1 and session_id=$2 limit 1), $1, 'assistant', $3, $4)`,
               [tenantId, sessionId, text, confidence]);

  return NextResponse.json({ answer: text, refs: contexts.map((c:any)=>c.url), confidence });
}
```

> In MVP, create a conversation row on first message from widget (see widget section).

---

## 11) API — widget JS

```ts
// app/api/widget/route.ts
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenant = searchParams.get('t');
  const voice = searchParams.get('voice') || 'friendly';
  const js = `(() => {
    const sid = localStorage.getItem('hn_sid') || (localStorage.setItem('hn_sid', crypto.randomUUID()), localStorage.getItem('hn_sid'));
    const bubble = document.createElement('div');
    bubble.style.cssText = 'position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:28px;box-shadow:0 10px 30px rgba(0,0,0,.2);background:#111;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;';
    bubble.innerText = '🗨️';
    document.body.appendChild(bubble);

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;bottom:90px;right:20px;width:340px;max-height:70vh;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.15);display:none;flex-direction:column;overflow:hidden;';

    panel.innerHTML = `
      <div style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:600">helpNINJA</div>
      <div id="hn_msgs" style="padding:12px;gap:8px;display:flex;flex-direction:column;overflow:auto"></div>
      <div style="display:flex;border-top:1px solid #eee">
        <input id="hn_input" placeholder="Ask a question..." style="flex:1;padding:10px;border:0;outline:none" />
        <button id="hn_send" style="padding:10px 14px;border:0;background:#111;color:#fff;cursor:pointer">Send</button>
      </div>`;
    document.body.appendChild(panel);

    function add(role, text){
      const wrap = document.getElementById('hn_msgs');
      const b = document.createElement('div');
      b.style.cssText = 'background:'+(role==='user'?'#eef2ff':'#f8fafc')+';padding:10px;border-radius:8px;white-space:pre-wrap;';
      b.textContent = text; wrap.appendChild(b); wrap.scrollTop = wrap.scrollHeight;
    }

    async function send(){
      const i = document.getElementById('hn_input'); const text = i.value.trim(); if(!text) return;
      i.value=''; add('user', text);
      const r = await fetch('/api/chat', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ tenantId: '${tenant}', sessionId: sid, message: text, voice: '${voice}' })});
      const j = await r.json(); add('assistant', j.answer || '…');
    }

    bubble.onclick = () => { panel.style.display = panel.style.display==='none'?'flex':'none'; };
    panel.querySelector('#hn_send').addEventListener('click', send);
    panel.querySelector('#hn_input').addEventListener('keydown', (e)=>{ if(e.key==='Enter') send(); });
  })();`;

  return new Response(js, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
```

Embed code a customer pastes:

```html
<script src="https://YOUR_APP_DOMAIN/api/widget?t=TENANT_PUBLIC_KEY&voice=friendly" async></script>
```

> In admin, show the exact snippet with their public key.

---

## 12) Dashboard (skeleton)

```tsx
// app/(dashboard)/page.tsx
export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">helpNINJA Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Deflection rate" value="—" />
        <Card title="Conversations" value="—" />
        <Card title="CSAT" value="—" />
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">Sources</h2>
        <p>Add a URL or sitemap to index your site.</p>
        {/* Form posts to /api/ingest */}
      </section>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }){
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
```

---

## 13) Billing: Stripe checkout + plan gates

### 13.0 SQL migration — billing columns

```sql
-- sql/011_billing.sql
alter table public.tenants
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text not null default 'starter',
  add column if not exists plan_status text not null default 'inactive', -- inactive|trialing|active|past_due|canceled
  add column if not exists current_period_end timestamptz;

-- ensure a usage row exists per tenant, auto-reset monthly
-- (we'll handle reset in app logic; this just ensures row)
insert into public.usage_counters (tenant_id, period_start, messages_count)
select t.id, date_trunc('month', now())::date, 0
from public.tenants t
left join public.usage_counters u on u.tenant_id = t.id
where u.tenant_id is null;
```

> Run this after the initial schema: `psql "$DATABASE_URL" -f sql/011_billing.sql`

Update `.env.example` (add site URL for redirects):

```bash
# Billing/URLs
SITE_URL=http://localhost:3000
```

---

### 13.1 Plan limits helper

```ts
// lib/limits.ts
export type Plan = 'starter' | 'pro' | 'agency';

export const PLAN_LIMITS: Record<Plan, { sites: number; messages: number }> = {
  starter: { sites: 1, messages: 1000 },
  pro: { sites: 3, messages: 5000 },
  agency: { sites: 10, messages: 20000 },
};

export function currentPeriodStartUTC(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
```

---

### 13.2 Stripe SDK + price mapping

```ts
// lib/stripe.ts
import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
});

export const PRICE_BY_PLAN = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
  agency: process.env.STRIPE_PRICE_AGENCY!,
} as const;

export type Plan = keyof typeof PRICE_BY_PLAN;

export function planFromPriceId(priceId?: string): Plan | null {
  if (!priceId) return null;
  const entry = Object.entries(PRICE_BY_PLAN).find(([, id]) => id === priceId);
  return (entry?.[0] as Plan) || null;
}
```

---

### 13.3 Checkout session API

```ts
// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_BY_PLAN, Plan } from '@/lib/stripe';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { tenantId, plan } = (await req.json()) as { tenantId: string; plan: Plan };
  if (!tenantId || !plan || !(plan in PRICE_BY_PLAN)) {
    return NextResponse.json({ error: 'tenantId and valid plan required' }, { status: 400 });
  }

  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

  // Load or create customer
  const { rows } = await query<{ stripe_customer_id: string | null; name: string | null }>(
    'select stripe_customer_id, name from public.tenants where id=$1',
    [tenantId]
  );
  if (!rows.length) return NextResponse.json({ error: 'tenant not found' }, { status: 404 });
  let customerId = rows[0].stripe_customer_id || undefined;
  if (!customerId) {
    const cust = await stripe.customers.create({ metadata: { tenantId } });
    customerId = cust.id;
    await query('update public.tenants set stripe_customer_id=$1 where id=$2', [customerId, tenantId]);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: PRICE_BY_PLAN[plan], quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${siteUrl}/billing?success=1`,
    cancel_url: `${siteUrl}/billing?canceled=1`,
    subscription_data: {
      metadata: { tenantId, plan },
    },
    metadata: { tenantId, plan },
  });

  return NextResponse.json({ url: session.url });
}
```

---

### 13.4 Billing portal API

```ts
// app/api/billing/portal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { tenantId } = await req.json();
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  const { rows } = await query<{ stripe_customer_id: string | null }>(
    'select stripe_customer_id from public.tenants where id=$1',
    [tenantId]
  );
  const customer = rows[0]?.stripe_customer_id;
  if (!customer) return NextResponse.json({ error: 'No Stripe customer on file' }, { status: 400 });
  const portal = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${siteUrl}/billing`,
  });
  return NextResponse.json({ url: portal.url });
}
```

---

### 13.5 Webhook — keep tenant + limits in sync

```ts
// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, planFromPriceId } from '@/lib/stripe';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')!;
  const buf = await req.text();
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      const tenantId = session.metadata?.tenantId as string | undefined;
      const subId = session.subscription as string | undefined;
      const customerId = session.customer as string | undefined;
      if (tenantId && subId && customerId) {
        // fetch subscription to get price/period end
        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = sub.items.data[0]?.price?.id;
        const plan = planFromPriceId(priceId) || 'starter';
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        await query(
          `update public.tenants set stripe_customer_id=$1, stripe_subscription_id=$2, plan=$3, plan_status='active', current_period_end=$4 where id=$5`,
          [customerId, subId, plan, periodEnd, tenantId]
        );
        // ensure usage counter row exists & reset month if needed
        await query(
          `insert into public.usage_counters (tenant_id, period_start, messages_count)
           values ($1, date_trunc('month', now())::date, 0)
           on conflict (tenant_id) do nothing`,
          [tenantId]
        );
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as any;
      const tenantId = sub.metadata?.tenantId as string | undefined;
      if (tenantId) {
        const priceId = sub.items.data[0]?.price?.id;
        const plan = planFromPriceId(priceId) || 'starter';
        const status = sub.status; // trialing, active, past_due, canceled
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        await query(
          `update public.tenants set plan=$1, plan_status=$2, stripe_subscription_id=$3, current_period_end=$4 where id=$5`,
          [plan, status, sub.id, periodEnd, tenantId]
        );
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as any;
      const tenantId = sub.metadata?.tenantId as string | undefined;
      if (tenantId) {
        await query(
          `update public.tenants set plan_status='canceled' where id=$1`,
          [tenantId]
        );
      }
      break;
    }
    // Optional: handle invoice.paid to reset usage on monthly renewals if desired
  }

  return NextResponse.json({ received: true });
}
```

---

### 13.6 Enforce plan gates (messages + sites)

```ts
// lib/usage.ts
import { query } from '@/lib/db';
import { PLAN_LIMITS } from './limits';

function firstOfMonth(): string { return new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0,10); }

export async function ensureUsageRow(tenantId: string) {
  await query(
    `insert into public.usage_counters (tenant_id, period_start, messages_count)
     values ($1, $2::date, 0)
     on conflict (tenant_id) do nothing`,
    [tenantId, firstOfMonth()]
  );
}

export async function resetIfNewMonth(tenantId: string) {
  const { rows } = await query<{ period_start: string }>('select period_start from public.usage_counters where tenant_id=$1', [tenantId]);
  if (!rows.length) return ensureUsageRow(tenantId);
  const ps = rows[0].period_start;
  const current = firstOfMonth();
  if (ps !== current) {
    await query('update public.usage_counters set period_start=$2::date, messages_count=0, last_reset=now() where tenant_id=$1', [tenantId, current]);
  }
}

export async function canSendMessage(tenantId: string): Promise<{ ok: boolean; reason?: string }> {
  const t = await query<{ plan: string; plan_status: string }>('select plan, plan_status from public.tenants where id=$1', [tenantId]);
  if (!t.rows.length) return { ok: false, reason: 'tenant not found' };
  const plan = (t.rows[0].plan || 'starter') as keyof typeof PLAN_LIMITS;
  await resetIfNewMonth(tenantId);
  const u = await query<{ messages_count: number }>('select messages_count from public.usage_counters where tenant_id=$1', [tenantId]);
  const used = u.rows[0]?.messages_count ?? 0;
  const limit = PLAN_LIMITS[plan].messages;
  if (used >= limit) return { ok: false, reason: 'message limit reached' };
  return { ok: true };
}

export async function incMessages(tenantId: string) {
  await query('update public.usage_counters set messages_count = messages_count + 1 where tenant_id=$1', [tenantId]);
}

export async function canAddSite(tenantId: string, hostToAdd: string): Promise<{ ok: boolean; reason?: string }> {
  const t = await query<{ plan: string }>('select plan from public.tenants where id=$1', [tenantId]);
  if (!t.rows.length) return { ok: false, reason: 'tenant not found' };
  const plan = (t.rows[0].plan || 'starter') as keyof typeof PLAN_LIMITS;
  const { rows } = await query<{ cnt: number }>(
    `select count(distinct split_part(replace(replace(url,'https://',''),'http://',''), '/', 1)) as cnt
     from public.documents where tenant_id=$1`, [tenantId]
  );
  const current = Number(rows[0]?.cnt || 0);
  // if this host already counted, allow; else check against limit
  const existing = await query<{ h: string }>(
    `select distinct split_part(replace(replace(url,'https://',''),'http://',''), '/', 1) as h
     from public.documents where tenant_id=$1`, [tenantId]
  );
  const hosts = new Set(existing.rows.map(r => r.h));
  const willBe = hosts.has(hostToAdd) ? current : current + 1;
  return willBe <= PLAN_LIMITS[plan].sites ? { ok: true } : { ok: false, reason: 'site limit reached' };
}
```

**Patch chat API to enforce message limits:**

```ts
// app/api/chat/route.ts (add near top)
import { canSendMessage, incMessages } from '@/lib/usage';

// inside POST handler, after validating inputs
const gate = await canSendMessage(tenantId);
if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402 });

// ... after computing final answer and before return
await incMessages(tenantId);
```

**Patch ingest API to enforce site count:**

```ts
// app/api/ingest/route.ts (add near top)
import { canAddSite } from '@/lib/usage';

// inside POST before crawl()
try {
  const u = new URL(input);
  const gate = await canAddSite(tenantId, u.host);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402 });
} catch {}
```

---

### 13.7 Billing UI (pricing + portal)

```tsx
// app/(dashboard)/billing/page.tsx
'use client';
import { useState } from 'react';

const PLANS = [
  { key: 'starter', name: 'Starter', price: '$29/mo', features: ['1 site', '1k messages', 'Email handoff'] },
  { key: 'pro', name: 'Pro', price: '$79/mo', features: ['3 sites', '5k messages', 'Slack handoff', 'Analytics'] },
  { key: 'agency', name: 'Agency', price: '$249/mo', features: ['10 sites', '20k messages', 'White-label', 'Multi-client'] },
] as const;

export default function BillingPage(){
  const [loading, setLoading] = useState<string | null>(null);
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('hn_tenant') || '' : '';

  async function checkout(plan: string){
    setLoading(plan);
    const r = await fetch('/api/billing/checkout', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ tenantId, plan })});
    const j = await r.json();
    setLoading(null);
    if (j.url) window.location.href = j.url; else alert(j.error || 'Error creating checkout');
  }

  async function portal(){
    const r = await fetch('/api/billing/portal', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ tenantId })});
    const j = await r.json();
    if (j.url) window.location.href = j.url; else alert(j.error || 'Error');
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map(p => (
          <div key={p.key} className="border rounded-2xl p-5 flex flex-col">
            <div className="text-xl font-semibold">{p.name}</div>
            <div className="text-3xl mt-2">{p.price}</div>
            <ul className="mt-3 text-sm text-gray-600 space-y-1">
              {p.features.map(f => <li key={f}>• {f}</li>)}
            </ul>
            <button onClick={()=>checkout(p.key)} disabled={loading===p.key} className="mt-4 btn btn-primary">
              {loading===p.key ? 'Loading…' : 'Choose ' + p.name}
            </button>
          </div>
        ))}
      </div>
      <div>
        <button onClick={portal} className="btn">Manage subscription</button>
      </div>
    </div>
  );
}
```

> For demo, set `localStorage.setItem('hn_tenant', '<tenant-uuid>')` after creating a tenant. Wire to your real auth/org selector later.

---

### 13.8 Manual tests

```bash
# 1) Run migration
psql "$DATABASE_URL" -f sql/011_billing.sql

# 2) Set env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_* and SITE_URL

# 3) Start dev and visit /billing, pick a plan → should redirect to Stripe Checkout

# 4) ngrok your dev server and set Stripe webhook endpoint:
#    stripe listen --forward-to https://<ngrok>/api/stripe/webhook

# 5) Complete a test checkout → verify tenants.plan/plan_status updates

# 6) Hit /api/chat until message limit → expect HTTP 402 with { error: 'message limit reached' }

# 7) Try adding a new domain beyond sites limit via /api/ingest → expect HTTP 402
```

---

## 14) Dockerfile (Node 20)

(Node 20)

```dockerfile
# Dockerfile
FROM node:20-alpine as deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || yarn || pnpm i

FROM node:20-alpine as builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine as runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
```

---

## 15) Quick start (local)

```bash
# 1) clone + install
npm i

# 2) set env
cp .env.example .env
# fill in Supabase/DB + OpenAI keys

# 3) run SQL (ensure pgvector extension installed)
psql "$DATABASE_URL" -f sql/001_extensions.sql
psql "$DATABASE_URL" -f sql/010_schema.sql
psql "$DATABASE_URL" -f sql/020_rls.sql
psql "$DATABASE_URL" -f sql/030_indexes.sql

# 4) dev
npm run dev

# 5) try ingestion
curl -X POST http://localhost:3000/api/ingest \
  -H 'content-type: application/json' \
  -d '{"tenantId":"<uuid>","input":"https://example.com/sitemap.xml"}'

# 6) embed widget in any static page for local test
# <script src="http://localhost:3000/api/widget?t=<tenant-public-key>" async></script>
```

---

## 16) Roadmap checkpoints

- Low‑confidence → email/Slack escalation with transcript
- Answer editor + tags → train canonical replies
- Auto‑recrawl scheduler + stale doc detector (etag/last‑modified)
- Analytics: deflection, top questions, gaps
- Agency spaces, white‑label widget

````


---

## 17) Escalations & Integrations (modular)

Make escalations pluggable so we can add **Slack / Email now**, and layer **Teams, Freshdesk, Zoho, Zendesk, Cherwell, Jira** later without touching core chat logic.

### 17.0 SQL — integrations, rules, outbox

```sql
-- sql/040_integrations.sql
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('email','slack','teams','freshdesk','zoho','zendesk','cherwell','jira')),
  name text not null,
  status text not null default 'active',
  credentials jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists integrations_tenant_idx on public.integrations(tenant_id);

create table public.escalation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  predicate jsonb not null default '{}'::jsonb,
  destinations jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists escalation_rules_tenant_idx on public.escalation_rules(tenant_id);

create table public.integration_outbox (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  integration_id uuid references public.integrations(id) on delete set null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists integration_outbox_pending on public.integration_outbox(status, next_attempt_at);
````

```sql
-- sql/041_integrations_rls.sql
alter table public.integrations enable row level security;
alter table public.escalation_rules enable row level security;
alter table public.integration_outbox enable row level security;

create policy integrations_tenant on public.integrations
  for all using (exists (select 1 from public.tenant_members tm where tm.tenant_id = integrations.tenant_id and tm.user_id = auth.uid()));

create policy rules_tenant on public.escalation_rules
  for all using (exists (select 1 from public.tenant_members tm where tm.tenant_id = escalation_rules.tenant_id and tm.user_id = auth.uid()));

create policy outbox_tenant on public.integration_outbox
  for all using (exists (select 1 from public.tenant_members tm where tm.tenant_id = integration_outbox.tenant_id and tm.user_id = auth.uid()));
```

### 17.1 ENV additions

```bash
SUPPORT_FROM_EMAIL=support@yourapp.com
SUPPORT_FALLBACK_TO_EMAIL=you@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```

### 17.2 Provider types

```ts
// lib/integrations/types.ts
export type ProviderKey = 'email'|'slack'|'teams'|'freshdesk'|'zoho'|'zendesk'|'cherwell'|'jira'
export type EscalationReason = 'low_confidence'|'restricted'|'handoff'|'user_request'|'fallback_error'
export type EscalationEvent = {
  tenantId: string
  conversationId: string
  sessionId: string
  userMessage: string
  assistantAnswer?: string
  confidence?: number
  refs?: string[]
  reason: EscalationReason
  meta?: Record<string, any>
}
export type IntegrationRecord = {
  id: string
  tenant_id: string
  provider: ProviderKey
  name: string
  status: 'active'|'disabled'
  credentials: Record<string, any>
  config: Record<string, any>
}
export interface Provider {
  key: ProviderKey
  supportsTickets?: boolean
  sendEscalation: (ev: EscalationEvent, i: IntegrationRecord) => Promise<{ ok: boolean; id?: string; url?: string; error?: string }>
}
```

### 17.3 Providers: Email + Slack (MVP)

```ts
// lib/integrations/providers/email.ts
import { Resend } from '@resend/node'
import { Provider, EscalationEvent, IntegrationRecord } from '../types'

const resend = new Resend(process.env.RESEND_API_KEY!)

function subject(ev: EscalationEvent){
  return `helpNINJA Escalation — ${ev.reason} — ${ev.sessionId.slice(0,6)}`
}
function body(ev: EscalationEvent){
  const refs = (ev.refs || []).map(u => `- ${u}`).join('
')
  return [
    `Reason: ${ev.reason}`,
    `Confidence: ${ev.confidence ?? 'n/a'}`,
    `Session: ${ev.sessionId}`,
    `Conversation: ${ev.conversationId}`,
    '',
    'User message:', ev.userMessage,
    '',
    'Assistant answer:', ev.assistantAnswer || '—',
    '',
    'References:', refs || '—',
    '',
    `Open: ${process.env.SITE_URL}/conversations/${ev.conversationId}`
  ].join('
')
}

const emailProvider: Provider = {
  key: 'email',
  async sendEscalation(ev: EscalationEvent, i: IntegrationRecord){
    const to = (i.config?.to as string) || process.env.SUPPORT_FALLBACK_TO_EMAIL
    const from = (i.config?.from as string) || process.env.SUPPORT_FROM_EMAIL || 'no-reply@updates.helpninja.app'
    if (!to) return { ok:false, error:'no email recipient configured' }
    try {
      const r = await resend.emails.send({ to, from, subject: subject(ev), text: body(ev) })
      return { ok: true, id: (r as any).id }
    } catch (e:any) { return { ok:false, error: e.message } }
  }
}
export default emailProvider
```

```ts
// lib/integrations/providers/slack.ts
import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function text(ev: EscalationEvent){
  const refs = (ev.refs || []).map(u => `• <${u}|ref>`).join('
')
  return `*Reason:* ${ev.reason}
*Confidence:* ${ev.confidence ?? 'n/a'}
*Session:* ${ev.sessionId}
*User:* ${ev.userMessage}
*Answer:* ${ev.assistantAnswer || '—'}
```
