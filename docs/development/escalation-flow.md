# Escalation Flow Documentation

This document describes the centralized escalation flow used throughout the helpNINJA platform.

## Overview

The escalation system allows conversations to be handed off to human support teams when:
- AI confidence is below a threshold (default 0.55)
- Users explicitly request human support
- Specific escalation rules match based on message content or patterns
- System errors occur that require manual intervention

All escalation logic is now centralized in `src/lib/escalation-service.ts` which provides a unified entry point for all escalation-related operations.

## Architecture

The centralized escalation service provides several key benefits:
- Consistent behavior across all escalation entry points
- Unified error handling and retry mechanisms
- Single location for escalation-related business logic
- Simplified integration of new escalation sources or destinations

### Core Components

1. **Escalation Service (`src/lib/escalation-service.ts`)** - Central service that manages all escalation logic
   - `handleEscalation(event: EscalationEvent)` - Main entry point for all escalations
   - Helper functions for loading configurations and destinations

2. **Escalation API Route (`src/app/api/escalate/route.ts`)** - REST endpoint for triggering escalations
   - Accepts POST requests with escalation event data
   - Validates input and passes to escalation service

3. **Retry Mechanism (`src/app/api/outbox/retry/route.ts`)** - Handles retrying failed escalations
   - Processes entries from `integration_outbox` table
   - Uses escalation service to re-attempt delivery

4. **Webhook Handlers** - Process internal and external webhook events
   - `src/lib/webhooks.ts` - For handling tenant-configured webhooks
   - `src/lib/internal-webhooks.ts` - For handling system-generated webhook events

## Escalation Flow

1. **Triggering Escalation**:
   - From chat route when confidence is low or user requests support
   - From rule-based triggers that match specific patterns
   - From webhook events that require support intervention
   - From manual API calls to the escalation endpoint

2. **Processing Escalation**:
   - Escalation event is passed to `escalationService.handleEscalation()`
   - Service loads configuration and determines appropriate destinations
   - For each destination, service attempts delivery

3. **Handling Results**:
   - Successful deliveries are logged and returned
   - Failed deliveries are written to `integration_outbox` for retry
   - Retries are processed via the outbox retry mechanism

## Integration Points

The escalation service integrates with:

- **Chat API** - For low confidence escalations or explicit handoff requests
- **Rule Engine** - For evaluating escalation and routing rules
- **Webhook System** - For both receiving and sending webhook events
- **Integration Providers** - For delivering escalations to external systems
- **Database Layer** - For storing failed escalations and retry attempts

## Adding New Escalation Sources

To add a new escalation source:

1. Import the escalation service:
   ```typescript
   import { handleEscalation } from '@/lib/escalation-service';
   ```

2. Create an escalation event:
   ```typescript
   const escalationEvent: EscalationEvent = {
     tenantId: '123',
     conversationId: '456',
     messages: [...], // Prior conversation messages
     userInfo: { ... }, // Optional user information
     reason: 'low_confidence', // Reason for escalation
     destination: 'slack', // Optional specific destination
     metadata: { ... } // Optional additional context
   };
   ```

3. Call the service:
   ```typescript
   await handleEscalation(escalationEvent);
   ```

## Adding New Escalation Destinations

To add a new destination for escalations:

1. Create a new provider in `src/lib/integrations/providers/<provider-name>.ts`
2. Implement the Provider interface with a `sendEscalation` method
3. Register the provider in `src/lib/integrations/registry.ts`
4. Update database types in `src/lib/integrations/types.ts` if needed

## Testing

When testing escalation flows:

1. Set `DEBUG=escalation` environment variable for detailed logging
2. Check the `integration_outbox` table for failed escalations
3. Use the retry endpoint to test the retry mechanism

## Related Database Tables

- `public.integrations` - Stores configured integration endpoints
- `public.integration_outbox` - Stores failed escalation attempts for retry
- `public.escalation_rules` - Stores rules for automatic escalation
- `public.webhook_endpoints` - Stores webhook configurations

## See Also

- [Integration Playbook](integration-playbook.md)
- [Webhook Configuration](../widget-configuration-guide.md)
- [API Reference](api-reference.md)
