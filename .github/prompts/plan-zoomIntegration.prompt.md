# Plan: Add Zoom Chat Webhook Integration to helpNINJA

Implement webhook-based Zoom chat notifications for customer escalations, following existing integration patterns for immediate deployment while documenting future meeting features.

## Implementation Steps

### 1. Create Zoom webhook provider

- Implement [zoom.ts](src/lib/integrations/providers/zoom.ts) following [slack.ts](src/lib/integrations/providers/slack.ts) pattern
- Use Zoom-specific payload formatting for chat webhooks
- Follow standard error handling pattern with logging (🔍, ❌, ✅ prefixes)
- Support webhook URL configuration with environment fallback (`ZOOM_WEBHOOK_URL`)

### 2. Register provider in system

- Add `zoom` to [registry.ts](src/lib/integrations/registry.ts) import and REGISTRY object
- Update `ProviderKey` type in [types.ts](src/lib/integrations/types.ts) to include `'zoom'`
- Follow existing provider registration patterns

### 3. Add marketplace entry

- Update [integrations.tsx](<src/app/(authenticated)/dashboard/integrations/integrations.tsx>) with new integration definition
- Configuration schema: webhook URL (required), channel ID (optional), bot name (optional)
- Use appropriate Zoom branding and feature descriptions
- Icon: `'fa-solid fa-duotone fa-video'` or similar Zoom icon

### 4. Create Zoom message formatter

- Implement Zoom chat webhook payload format (research Zoom Chat API documentation)
- Include escalation alerts, customer context, conversation details
- Add dashboard links for easy navigation
- Handle feedback vs regular escalation message types
- Extract contact info and reference links like other providers

### 5. Document future features

- Add todo entry in [roadmap.md](docs/development/roadmap.md) Phase 3 section
- Document Zoom meeting creation integration for future implementation
- Include advanced features like recording transcription, screen sharing integration

## Technical Implementation Details

### Provider Implementation Pattern

```typescript
const zoomProvider: Provider = {
    key: 'zoom',
    async sendEscalation(ev: EscalationEvent, i: IntegrationRecord) {
        // 1. Logging and validation
        // 2. Webhook URL retrieval (config > env fallback)
        // 3. Zoom-specific payload formatting
        // 4. HTTP POST request with error handling
        // 5. Response logging with integration context
    },
};
```

### Configuration Schema

```typescript
{
    webhook_url: { type: 'url', label: 'Zoom Webhook URL', required: true, placeholder: 'https://api.zoom.us/v2/chat/...' },
    channel_id: { type: 'text', label: 'Channel ID', required: false, placeholder: 'Optional channel ID' },
    bot_name: { type: 'text', label: 'Bot Display Name', required: false, placeholder: 'helpNINJA Bot' }
}
```

### Message Format (Estimated Zoom payload)

```typescript
const payload = {
    robot: {
        account_id: 'zoom_account_id',
        content: {
            head: {
                text: '🚨 helpNINJA Escalation Alert',
                style: {
                    color: '#FF6B35',
                    bold: true,
                },
            },
            body: [
                {
                    type: 'message',
                    text: formatZoomMessage(ev),
                },
            ],
        },
        to_jid: 'channel_jid_or_user_jid',
    },
};
```

## Further Considerations

### Authentication Approach

- **Current**: Start with webhook URLs (simple, like Slack pattern)
- **Future**: Consider OAuth 2.0 for advanced features when implementing meeting creation

### Zoom Capabilities Focus

- **Current**: Chat notifications only
- **Future**: Instant meeting creation, recording integration, screen sharing

### Message Formatting

- **Current**: Enhanced rich formatting similar to Teams Adaptive Cards

### Environment Variables

- Add `ZOOM_WEBHOOK_URL` fallback support following existing integration patterns
- Consider `ZOOM_BOT_NAME`, `ZOOM_CHANNEL_ID` for global defaults

## Roadmap Integration (Future Features)

### Phase 3 - Advanced Zoom Integration

- **Zoom meeting creation**: Create instant meetings for escalations
- **Meeting scheduling**: Schedule follow-up meetings with customers
- **Recording transcription**: Auto-transcribe support meetings
- **Screen sharing integration**: Direct screen sharing from chat
- **Meeting analytics**: Track meeting outcomes and resolution rates
- **Calendar integration**: Sync with team calendars for availability
- **Advanced authentication**: Full OAuth 2.0 flow for enhanced permissions

### Benefits of Future Meeting Features

- Seamless escalation from chat to video call
- Improved customer experience with immediate face-to-face support
- Better issue resolution through screen sharing and demonstration
- Automated meeting notes and transcription for follow-up
- Integration with existing helpdesk workflows

## Success Metrics

- Webhook delivery success rate (target: >95%)
- Time from escalation to team notification (target: <30 seconds)
- User adoption rate in marketplace (track installation counts)
- Error rate and retry success (leverage existing outbox pattern)
- Customer satisfaction improvement with faster human handoff
