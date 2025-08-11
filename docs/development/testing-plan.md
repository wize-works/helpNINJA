# HelpNinja Testing Plan

## Unit Tests
- Chat message handling (RAG prompt build, OpenAI client wrapper)
- Usage gating logic (limits, monthly reset)
- Escalation trigger decision (confidence threshold)

## Integration Tests
- Ingestion: crawl → chunk → embed → insert rows
- RAG search: lexical + vector merge/dedupe
- Escalation: Slack webhook and Email (Resend) dispatch
- Stripe: Checkout/Portal creation and webhook updates tenant plan
- Dashboard stats: counts for conversations/messages/integrations/outbox/documents/chunks

## Load Testing
- k6 scripts simulating chat traffic

## UAT
- Verify dashboard usability
