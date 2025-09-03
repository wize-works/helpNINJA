# helpNINJA API Documentation

This directory contains comprehensive API documentation for the helpNINJA platform.

## Files

### OpenAPI Specifications
- **`../public/openapi.yaml`** - Complete OpenAPI 3.0 specification in YAML format
- **`../public/openapi.json`** - Complete OpenAPI 3.0 specification in JSON format  
- **`../public/api-docs.html`** - Interactive HTML documentation using Swagger UI

### Integration Guides
- **`ai-agent-integration-guide.md`** - Comprehensive guide for AI assistants and developers
- **`developer-api-specification.md`** - Detailed API reference with examples

## Quick Start

### Interactive Documentation
Access the interactive API documentation at:
- **Production**: https://helpninja.app/api-docs.html
- **Development**: http://localhost:3001/api-docs.html

Or download the OpenAPI specifications:
- **JSON Format**: https://helpninja.app/openapi.json
- **YAML Format**: https://helpninja.app/openapi.yaml

### Import into Tools
Use the OpenAPI specs with your favorite API tools:

- **Postman**: Import `openapi.json` to generate a collection
- **Insomnia**: Import `openapi.yaml` for request templates  
- **VS Code REST Client**: Use with OpenAPI extensions
- **curl**: Generate curl commands from the spec

## API Overview

The helpNINJA API provides access to:

### 🤖 **Chat & Conversations**
- Send messages to AI assistant (`/chat`, `/chat-api`)
- Create and manage conversations (`/conversations`)
- RAG-powered responses with intent classification
- Automatic escalation for low-confidence answers

### 📄 **Content Management**  
- Ingest content from URLs, sitemaps (`/ingest`)
- Manage document sources (`/sources`)
- Content chunking and embedding generation
- PostgreSQL + pgvector storage

### 🔔 **Webhooks**
- Real-time event notifications (`/webhooks`)
- Signature verification with HMAC SHA-256
- Events: conversation.started, message.sent, escalation.triggered, document.ingested

### 📊 **Analytics**
- Usage statistics and limits (`/usage`)
- Conversation metrics and trends (`/usage-stats`)
- Response confidence tracking

### 💰 **Billing**
- Stripe checkout sessions (`/billing/checkout`)
- Customer portal access (`/billing/portal`)
- Plan management (starter, pro, agency)

### 🎨 **Widget**
- JavaScript widget delivery (`/widget`)
- Cross-domain CORS support
- Site-specific configuration

## Authentication

The API uses API keys for authentication:

```bash
# Bearer Token (recommended)
curl -H "Authorization: Bearer sk_your_api_key" \
  "https://helpninja.app/api/usage"

# API Key Header
curl -H "X-API-Key: sk_your_api_key" \
  "https://helpninja.app/api/conversations"

# Query Parameter (less secure)
curl "https://helpninja.app/api/usage?api_key=sk_your_api_key"
```

### API Key Types
- `pk_*` - Public keys (client-side safe, widget integration)
- `sk_*` - Secret keys (server-side only, full API access)
- `whk_*` - Webhook keys (webhook endpoint authentication)

## Rate Limiting

- **Default**: 1,000 requests per hour per API key
- **Headers**: Rate limit info in `X-RateLimit-*` headers
- **429 Response**: When limit exceeded with retry information

## Error Handling

All errors use consistent JSON format:

```json
{
  "error": "error_code",
  "message": "Human readable error message",
  "details": {
    "field": "field_name", 
    "code": "validation_code"
  }
}
```

### Common HTTP Status Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid/missing API key)
- `402` - Payment Required (usage limit exceeded)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Rate Limited (too many requests)
- `500` - Internal Server Error

## Webhooks

helpNINJA supports real-time webhooks for key events:

### Available Events
- `conversation.started` - New conversation initiated
- `message.sent` - Message sent (user or assistant)
- `escalation.triggered` - AI escalated to human support
- `document.ingested` - Content successfully indexed

### Signature Verification
Webhooks are signed using HMAC SHA-256:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
    
  return `sha256=${computedSignature}` === signature;
}
```

### Example Webhook Payload

```json
{
  "event": "escalation.triggered",
  "timestamp": "2025-08-13T10:32:00Z",
  "tenant_id": "tenant-uuid",
  "data": {
    "conversation_id": "conv-uuid",
    "reason": "low_confidence",
    "confidence": 0.45,
    "user_message": "How do I configure the flux capacitor?",
    "assistant_response": "I'm not sure about that. Let me connect you with support."
  }
}
```

## Widget Integration

### Quick Setup
Add to any website:

```html
<script>
  window.helpNINJAConfig = {
    tenantId: "pk_your_tenant_key",
    siteId: "your_site_id",
    verificationToken: "your_verification_token",
    voice: "friendly"
  };
  var s = document.createElement("script");
  s.src = "https://helpninja.app/api/widget?t=pk_your_tenant_key&s=your_site_id&k=your_verification_token";
  s.async = true;
  document.head.appendChild(s);
</script>
```

### Configuration Options
- **Voice**: friendly, professional, casual, formal
- **Theme**: light, dark, auto
- **Position**: bottom-right, bottom-left, top-right, top-left
- **Colors**: Custom primary color and branding
- **Behavior**: Auto-open delay, welcome message

## SDKs and Examples

### JavaScript/Node.js
```javascript
class HelpNinjaSDK {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://helpninja.app/api';
  }
  
  async chat(tenantId, sessionId, message) {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, sessionId, message })
    });
    return response.json();
  }
}
```

### Python
```python
import requests

class HelpNinjaSDK:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://helpninja.app/api'
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def get_usage(self):
        response = requests.get(
            f'{self.base_url}/usage',
            headers=self.headers
        )
        return response.json()
```

## Development

### Local Testing
```bash
# Test against local development server
curl -H "Authorization: Bearer sk_test_key" \
  "http://localhost:3001/api/usage"
```

### Environment URLs
- **Production**: `https://helpninja.app/api`
- **Development**: `http://localhost:3001/api`

## Support

For API support or questions:
- **Documentation**: Full API reference in `developer-api-specification.md`
- **Integration Guide**: AI-friendly guide in `ai-agent-integration-guide.md`
- **Support**: Contact via https://helpninja.app/support

## Version History

- **v1.0.0** - Initial API release with core functionality
  - Chat and conversation management
  - Content ingestion and RAG search
  - Webhook system
  - Widget integration
  - Stripe billing integration
