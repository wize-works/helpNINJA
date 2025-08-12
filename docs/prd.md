HelpNinja Product Requirements Document (PRD)
1. Purpose
HelpNinja is an AI-powered customer support platform that combines an embeddable chat widget with a centralized analytics dashboard. It enables businesses to deliver instant, AI-driven answers while providing escalation paths to human support channels when needed. The system integrates with popular communication tools, supports usage-based billing, and provides detailed performance analytics.

2. Goals
Deliver a seamless, responsive, and branded chat experience for customers.

Provide businesses with actionable insights into customer interactions.

Offer easy integration with third-party communication tools (e.g., Slack, Email).

Maintain strict tenant isolation and secure data handling.

Support flexible subscription-based monetization.

3. Functional Requirements
3.1 Tenant Onboarding
Users can sign up and create an account.

Configure a unique chat widget for embedding.

Manage profile, billing, and integrations from the dashboard.

3.2 Chat Widget
Floating button with expandable chat panel.

AI-generated responses using hybrid retrieval-augmented generation (RAG).

Maintains conversation history per visitor session.

Escalates conversations based on:

Low confidence threshold (< 0.55)

Keyword triggers

No-response conditions

Supports voice/tone options (e.g., friendly or formal).

3.3 Integrations Management
Add, edit, and remove integrations from the dashboard.

Supported providers:

Slack (via Webhook)

Email (via Resend API)

Store provider credentials securely with encryption.

Automatic retry for failed sends (integration outbox).

3.4 Escalation System
Triggered automatically based on escalation criteria.

Routes messages to connected integrations.

Falls back to environment-based defaults if no integrations are configured.

3.5 Analytics Dashboard
Display:

Total conversations

Messages sent this month vs. plan limit

Low-confidence message rate

Active integrations count

Indexed sources (documents/chunks)

Light/dark theme toggle persisted per user.

Responsive layout for mobile and desktop.

3.6 Payments & Subscription Management
Integration with Stripe Checkout for new subscriptions.

Stripe Billing Portal for plan changes and cancellations.

Plan-based usage limits enforced server-side.

3.7 Data Ingestion
Accept a single URL or sitemap for ingestion.

Crawl → Chunk → Embed → Store in PostgreSQL with pgvector and tsvector.

Limit ingestion based on plan constraints.

4. Non-Functional Requirements
4.1 Performance
API latency target: <200ms for non-OpenAI calls.

Chat response latency target: <2s including AI processing.

4.2 Security
Supabase Auth with JWT sessions.

Row Level Security (RLS) on all multi-tenant tables.

Encryption for integration credentials.

HTTPS enforced for all traffic.

Verified Stripe webhook events with raw body validation.

4.3 Scalability
Multi-tenant architecture.

Horizontally scalable frontend and backend.

Modular integration provider system.

4.4 Usability
Low learning curve with intuitive navigation.

Accessible via WCAG 2.1 AA guidelines.

Fully keyboard navigable with screen-reader-friendly labels.

5. Data Model Overview
tenants: Tenant details, plan, billing info.

conversations: Linked to tenants, stores chat sessions.

messages: Stores user and AI messages with confidence scores.

documents / chunks: Source content for AI knowledge base.

usage_counters: Tracks usage for gating.

integrations / integration_outbox: Integration configuration and failed send retries.

6. APIs
/api/widget: Returns embeddable widget script.

/api/chat: Handles AI chat responses and escalation checks.

/api/escalate: Sends escalation messages to configured integrations.

/api/integrations: CRUD for integration records.

/api/ingest: Handles ingestion and indexing of source content.

/api/billing/checkout: Creates a Stripe Checkout session.

/api/billing/portal: Creates a Stripe Billing Portal session.

/api/stripe/webhook: Handles Stripe subscription lifecycle events.

7. Success Metrics
Reduction in average customer support response time.

Increase in self-service resolution rate.

High adoption of integrations among active tenants.

Sustained subscription renewal rates.

8. Constraints & Considerations
Must avoid vendor lock-in for AI and hosting.

All code should be modular to facilitate adding new integrations.

Data storage must comply with privacy regulations (e.g., GDPR).

