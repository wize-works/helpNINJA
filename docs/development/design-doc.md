# HelpNinja Design Document

## Overview
HelpNinja is a modern AI-powered customer support widget and dashboard platform, designed to deliver a premium, frictionless support experience. Built with **Next.js (App Router)**, **TailwindCSS** + **DaisyUI** custom themes, and **FontAwesome** icons.

The UI is inspired by clean, data-focused dashboards, featuring visually appealing charts, clear typography, and light/dark theming.

## UI/UX Design Principles
- **Modern and Enticing**: Inspired by best-in-class SaaS dashboards.
- **Color Themes**: Custom DaisyUI themes (`ninja-light`, `ninja-dark`) ensure branding consistency.
- **FontAwesome Icons**: `fa-duotone` and `fa-duotone fa-solid` for a professional look.
- **Responsive Layout**: Fully functional across desktop and mobile.

## Layout
- **Left Sidebar**: Navigation (Overview, Billing, Integrations, Settings)
- **Top Bar**: Brand, search, utilities, theme toggle
- **Main Content (Dashboard)**: App KPIs + panels:
	- Conversations total
	- Messages used this month (vs plan limit)
	- Low-confidence rate (auto-escalation threshold 0.55)
	- Active integrations and pending outbox
	- Sources indexed (documents/chunks)

## Tech Stack
- **Frontend**: Next.js 15, App Router
- **Styling**: TailwindCSS + DaisyUI, FontAwesome icons
- **Backend**: Supabase (PostgreSQL) for DB, API routes in Next.js
- **Payments**: Stripe Checkout + Subscription Plan Gates
- **Integrations**: Slack + Email escalation (modular for Teams, Freshdesk, etc.)
- **Auth**: Supabase Auth with RLS

## Theme Variables
See `theme.css` for `--p`, `--s`, `--a`, `--n`, `--b1` etc. (OKLCH format).

## Core Flows
- **Widget** (Edge): serves a small JS snippet that injects a chat bubble, stores `hn_sid`, calls `/api/chat`
- **Chat** (Node): usage gate → `searchHybrid` (tsvector + pgvector) → OpenAI chat → store message → auto-escalate on low confidence via integration dispatch
- **Ingestion** (Node): crawl page/sitemap → chunk → embed → store docs/chunks
- **Billing** (Node): Checkout/Portal and Webhook update tenant plan/status and ensure `usage_counters`

## Accessibility
- WCAG 2.1 AA contrast
- Keyboard navigable
- Screen-reader friendly labels
