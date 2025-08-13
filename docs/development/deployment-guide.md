# helpNINJA Deployment Guide

Stack
- Next.js App Router (Node runtime for DB/OpenAI, Edge for widget)
- PostgreSQL (Supabase: local or cloud) with pgvector + tsvector
- Stripe for subscriptions
- Optional Docker/Kubernetes

Key env
- DATABASE_URL (Postgres URI)
	- Supabase Local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
	- Supabase Cloud: `postgresql://postgres:<PWD>@db.<project>.supabase.co:5432/postgres?sslmode=require`
- OPENAI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SITE_URL
- NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (for admin ops)

Runtime notes
- DB/OpenAI/Stripe routes must export `export const runtime = 'nodejs'`.
- The Stripe webhook must read raw body: `await req.text()` and construct event.
- The widget script runs on Edge (no DB/OpenAI).

Local dev
1) Create `.env.local` with required variables (see `.env` template)
2) Start Supabase local: `supabase start` → confirm port 54322
3) Run migrations to enable pgvector/tsvector and create tables
4) `npm run dev` (port 3001)

Docker
- Dev compose maps 3001→3000 and mounts source
- Production image builds Next and runs on port 3000

Kubernetes
- Provide secrets for DATABASE_URL, OpenAI, Stripe, Supabase
- Expose service on 80/443; set SITE_URL accordingly
