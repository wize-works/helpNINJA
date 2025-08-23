````markdown
# User Message Flow

This document outlines the complete flow of a user message in the helpNINJA system, from initial submission in the widget through processing, RAG search, response generation, and potential escalation paths.

## Message Flow Diagram

```mermaid
flowchart TD
    A["User sends message via Widget\n(src/app/api/widget/route.ts)"] --> B["API: chat endpoint receives message\n(src/app/api/chat/route.ts)"]
    B --> C{"Check usage limits\n(src/lib/usage.ts)"}
    C -->|Limit exceeded| D[Return error response]
    C -->|Within limits| E["RAG search for relevant content\n(src/lib/rag.ts)"]
    
    E --> F["Perform lexical search via tsvector\n(src/lib/rag.ts:searchLexical)"]
    E --> G["Perform vector search via embeddings\n(src/lib/embeddings.ts)"]
    F & G --> H["Merge and deduplicate results\n(src/lib/rag.ts:searchHybrid)"]
    
    H --> I["Format context and prepare prompt\n(src/app/api/chat/route.ts)"]
    I --> J["Send to OpenAI for response\n(src/app/api/chat/route.ts)"]
    J --> K["Persist message in database\n(src/app/api/chat/route.ts)"]
    K --> L["Increment usage counter\n(src/lib/usage.ts:incMessages)"]
    
    L --> M{"Check confidence score\n(src/app/api/chat/route.ts)"}
    M -->|Score < threshold| N["Trigger escalation\n(src/app/api/chat/route.ts)"]
    M -->|Score >= threshold| O["Return response to user\n(src/app/api/chat/route.ts)"]
    
    N --> P["API: escalate endpoint\n(src/app/api/escalate/route.ts)"]
    P --> Q{"Fetch active rules\n(src/app/api/escalate/route.ts)"}
    Q --> R{"Evaluate rules against message\n(src/lib/rule-engine.ts)"}
    
    R -->|Rule matches| S["Trigger rule.matched webhook\n(src/lib/webhooks.ts)"]
    R -->|No match| T["Use default integrations\n(src/app/api/escalate/route.ts)"]
    
    S --> U["Use rule destinations\n(src/app/api/escalate/route.ts)"]
    U & T --> V["dispatchEscalation\n(src/lib/integrations/dispatch.ts)"]
    
    V --> W{"Integration type\n(src/lib/integrations/registry.ts)"}
    W -->|Email| X["Send via Email provider\n(src/lib/integrations/providers/email.ts)"]
    W -->|Slack| Y["Send via Slack provider\n(src/lib/integrations/providers/slack.ts)"]
    W -->|Other| Z["Send via custom provider\n(src/lib/integrations/providers/*.ts)"]
    
    X & Y & Z --> AA{"Success?\n(src/lib/integrations/dispatch.ts)"}
    AA -->|Yes| AB["Update integration stats\n(src/lib/integrations/dispatch.ts)"]
    AA -->|No| AC["Write to integration_outbox\n(src/app/api/integrations/outbox/process/route.ts)"]
    
    P --> AD["Trigger escalation.triggered webhook\n(src/lib/webhooks.ts)"]
    
    O --> AE["Trigger message.sent webhook\n(src/lib/webhooks.ts)"]
    AE & AB & AC --> AF[End of flow]
```

## Detailed Explanation

### Initial Request Processing
1. **Widget Interaction**: User sends a message via the embedded chat widget (`src/app/api/widget/route.ts`)
2. **API Endpoint**: `/api/chat` receives the message with `tenantId`, `sessionId`, and message content (`src/app/api/chat/route.ts`)
3. **Usage Validation**: System checks if tenant has remaining message quota via `canSendMessage` (`src/lib/usage.ts`)

### RAG (Retrieval Augmented Generation)
4. **Search Process**: The system performs hybrid search combining (`src/lib/rag.ts`):
   - **Lexical Search**: Uses PostgreSQL's tsvector for text matching (`searchLexical`)
   - **Vector Search**: Uses embeddings to find semantically similar content (`src/lib/embeddings.ts`)
5. **Results Processing**: Merges both search types and deduplicates by URL (`searchHybrid`)

### Response Generation
6. **Context Formation**: Formats retrieved documents into context for the LLM (`src/app/api/chat/route.ts`)
7. **OpenAI Request**: Sends formatted prompt with context to OpenAI (`src/app/api/chat/route.ts`)
8. **Persistence**: Stores the conversation message pair in the database (`src/app/api/chat/route.ts`)
9. **Usage Tracking**: Increments the tenant's message counter (`src/lib/usage.ts:incMessages`)

### Confidence Assessment
10. **Threshold Check**: Evaluates if the confidence score meets minimum threshold (0.55) (`src/app/api/chat/route.ts`)
11. **Below Threshold**: If confidence is low, triggers escalation flow (`src/app/api/chat/route.ts`)
12. **Above Threshold**: If confidence is acceptable, returns response to user (`src/app/api/chat/route.ts`)

### Escalation Flow
13. **Rule Evaluation** (`src/app/api/escalate/route.ts`): 
    - Fetches active escalation rules for the tenant
    - Evaluates each rule against the message context (`src/lib/rule-engine.ts`)
    - Rules are checked in priority order (highest first)
14. **Webhooks**: Triggers `escalation.triggered` webhook event (`src/lib/webhooks.ts`)
15. **Rule Matching**:
    - If a rule matches, triggers `rule.matched` webhook (`src/lib/webhooks.ts`)
    - Uses the rule's configured destinations for escalation

### Integration Dispatch
16. **Provider Selection**: Routes to appropriate integration provider (`src/lib/integrations/registry.ts`)
17. **Delivery Attempt**: Attempts to deliver the escalation via selected provider (`src/lib/integrations/providers/*.ts`)
18. **Outcome Tracking** (`src/lib/integrations/dispatch.ts`):
    - Success: Updates integration statistics
    - Failure: Writes to integration_outbox for retry (`src/app/api/integrations/outbox/process/route.ts`)

### Final Webhook Events
19. **Event Notifications**: Triggers appropriate webhooks for the entire process (`src/lib/webhooks.ts`):
    - `message.sent` when assistant responds
    - `escalation.triggered` when escalation begins
    - `rule.matched` when a specific rule matches

## Common Issues and Troubleshooting
- **Missing Webhooks**: Ensure webhook endpoints are properly configured and active
- **Failed Escalations**: Check integration configuration and credentials
- **Rule Matching Problems**: Verify rule conditions are correctly formatted
- **Integration Format Mismatch**: Ensure destination format uses the expected field names (`integration_id` not `integrationId`)

This diagram and explanation cover the complete lifecycle of a user message in the helpNINJA system.
````
