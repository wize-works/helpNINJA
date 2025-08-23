````markdown
# User Message Flow (2023 Update)

This document outlines the complete flow of a user message in the helpNINJA system, from initial submission in the widget through processing, RAG search, response generation, and potential escalation paths. This version reflects the 2023 architectural updates with the centralized escalation service.

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
    
    %% Updated escalation flow with centralized service
    N --> ESC["Centralized Escalation Service\n(src/lib/escalation-service.ts)"]
    
    %% The escalate API now uses the service
    P["API: escalate endpoint\n(src/app/api/escalate/route.ts)"] --> ESC
    
    %% Escalation service handles rule evaluation
    ESC --> Q{"Fetch active rules"}
    Q --> R{"Evaluate rules against message\n(src/lib/rule-engine.ts)"}
    
    R -->|Rule matches| S["Log rule match and fetch destinations"]
    R -->|No match| T["Use default integrations"]
    
    %% Escalation service triggers webhooks as needed
    ESC --> AD["Trigger escalation.triggered webhook\n(src/lib/webhooks.ts)"]
    
    %% Escalation service dispatches to integrations
    S --> ESC2["Continue escalation processing"]
    T --> ESC2
    
    ESC2 --> W{"Integration type\n(src/lib/integrations/registry.ts)"}
    W -->|Email| X["Send via Email provider\n(src/lib/integrations/providers/email.ts)"]
    W -->|Slack| Y["Send via Slack provider\n(src/lib/integrations/providers/slack.ts)"]
    W -->|Other| Z["Send via custom provider\n(src/lib/integrations/providers/*.ts)"]
    
    X & Y & Z --> AA{"Success?\n(handled by escalation service)"}
    AA -->|Yes| AB["Update integration stats"]
    AA -->|No| AC["Write to integration_outbox\n(for retry later)"]
    
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
11. **Below Threshold**: If confidence is low, triggers escalation flow via the escalation service (`src/app/api/chat/route.ts`)
12. **Above Threshold**: If confidence is acceptable, returns response to user (`src/app/api/chat/route.ts`)

### Escalation Flow (Updated Architecture)
13. **Centralized Service**: All escalation handling is now managed by a centralized service (`src/lib/escalation-service.ts`)
14. **Entry Points**: The service can be called from:
    - Chat API when confidence is low or rule matches (`src/app/api/chat/route.ts`)
    - Escalate API for direct escalation requests (`src/app/api/escalate/route.ts`)
    - Webhooks system when processing webhook events (`src/lib/webhooks.ts`)
15. **Rule Evaluation**: The service handles fetching and evaluation of rules:
    - Fetches active escalation rules for the tenant
    - Evaluates rules against the message context (`src/lib/rule-engine.ts`)
    - Rules are checked in priority order (highest first)
16. **Webhooks Management**: The service manages webhook triggering to prevent duplicates
17. **Destination Resolution**: The service resolves destinations from:
    - Matched rule destinations
    - Direct integration specification
    - Tenant default integrations

### Integration Dispatch
18. **Provider Selection**: Routes to appropriate integration provider (`src/lib/integrations/registry.ts`)
19. **Delivery Attempt**: Attempts to deliver the escalation via selected provider (`src/lib/integrations/providers/*.ts`)
20. **Outcome Tracking**:
    - Success: Updates integration statistics
    - Failure: Writes to integration_outbox for retry

### Final Webhook Events
21. **Event Notifications**: Triggers appropriate webhooks for the entire process (`src/lib/webhooks.ts`):
    - `message.sent` when assistant responds
    - `escalation.triggered` when escalation begins
    - `rule.matched` when a specific rule matches

## Common Issues and Troubleshooting
- **Missing Webhooks**: Ensure webhook endpoints are properly configured and active
- **Failed Escalations**: Check integration configuration and credentials
- **Rule Matching Problems**: Verify rule conditions are correctly formatted
- **Integration Format Mismatch**: Ensure destination format uses the expected field names (`integration_id` not `integrationId`)

This diagram and explanation cover the complete lifecycle of a user message in the helpNINJA system with the centralized escalation service architecture.
````
