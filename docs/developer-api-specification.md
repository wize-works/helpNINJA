# helpNINJA Developer API Documentation

*Version 1.0 - August 13, 2025*

## Base URLs & Domain Strategy

### Current Implementation
- **Main App**: `https://helpninja.app`
- **API Endpoints**: `https://helpninja.app/api/*`

### Recommended Developer Portal Structure
- **Developer Portal**: `https://helpninja.app/developers`
- **API Documentation**: `https://helpninja.app/developers/docs`
- **Future API Subdomain**: `https://api.helpninja.app/v1/*` (when ready)

## Authentication

### API Key Types
Your platform supports three types of API keys:

```bash
# Public Keys (client-side safe)
pk_xxxxxxxxxxxxxxxxxxxxx

# Secret Keys (server-side only) 
sk_xxxxxxxxxxxxxxxxxxxxx

# Webhook Keys (webhook authentication)
whk_xxxxxxxxxxxxxxxxxxxxx
```

### Authentication Methods

#### 1. Bearer Token (Recommended)
```bash
curl -H "Authorization: Bearer sk_your_secret_key_here" \
  "https://helpninja.app/api/conversations"
```

#### 2. X-API-Key Header
```bash
curl -H "X-API-Key: sk_your_secret_key_here" \
  "https://helpninja.app/api/conversations"
```

#### 3. Query Parameter (Less Secure)
```bash
curl "https://helpninja.app/api/conversations?api_key=sk_your_secret_key_here"
```

## Core API Endpoints

### 1. Chat & Conversations

#### Create Conversation
```bash
POST https://helpninja.app/api/conversations
Authorization: Bearer sk_your_secret_key_here
Content-Type: application/json

{
  "session_id": "unique-session-id",
  "metadata": {
    "user_name": "John Doe",
    "user_email": "john@example.com"
  }
}
```

**Response:**
```json
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "unique-session-id", 
  "created_at": "2025-08-13T10:30:00Z",
  "status": "created"
}
```

#### List Conversations
```bash
GET https://helpninja.app/api/conversations?limit=20&offset=0
Authorization: Bearer sk_your_secret_key_here
```

**Response:**
```json
{
  "conversations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "session_id": "unique-session-id",
      "metadata": {...},
      "created_at": "2025-08-13T10:30:00Z",
      "updated_at": "2025-08-13T10:35:00Z",
      "message_count": 6,
      "last_message_at": "2025-08-13T10:35:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "count": 1
  }
}
```

#### Send Chat Message (Widget Endpoint)
```bash
POST https://helpninja.app/api/chat
Content-Type: application/json
Origin: https://your-website.com

{
  "tenantId": "pk_your_public_key_here",
  "sessionId": "unique-session-id",
  "message": "How do I reset my password?",
  "voice": "friendly"
}
```

**Response:**
```json
{
  "answer": "To reset your password, click the 'Forgot Password' link on the login page...",
  "refs": ["https://your-site.com/help/password-reset"],
  "confidence": 0.85,
  "source": "ai"
}
```

### 2. Content Management

#### Ingest Content
```bash
POST https://helpninja.app/api/ingest
Authorization: Bearer sk_your_secret_key_here
Content-Type: application/json

{
  "input": "https://your-website.com/help",
  "siteId": "site-uuid-optional"
}
```

**Response:**
```json
{
  "message": "Ingestion started",
  "documentsIngested": 15,
  "chunksCreated": 142,
  "tokensEmbedded": 28439
}
```

#### List Documents  
```bash
GET https://helpninja.app/api/sources
Authorization: Bearer sk_your_secret_key_here
```

### 3. Site Management

#### Create Site
```bash
POST https://helpninja.app/api/sites
Authorization: Bearer sk_your_secret_key_here
Content-Type: application/json

{
  "name": "Main Website",
  "domain": "example.com"
}
```

#### Verify Site
```bash
POST https://helpninja.app/api/sites/{site_id}/verify
Authorization: Bearer sk_your_secret_key_here
Content-Type: application/json

{
  "method": "meta_tag"
}
```

### 4. Team Management

#### List Team Members
```bash
GET https://helpninja.app/api/team
Authorization: Bearer sk_your_secret_key_here
```

#### Invite Team Member
```bash
POST https://helpninja.app/api/team/invitations
Authorization: Bearer sk_your_secret_key_here
Content-Type: application/json

{
  "email": "new-member@example.com",
  "role": "support"
}
```

### 5. Analytics & Usage

#### Get Usage Statistics
```bash
GET https://helpninja.app/api/usage
Authorization: Bearer sk_your_secret_key_here
```

**Response:**
```json
{
  "used": 245,
  "limit": 5000,
  "plan": "pro",
  "period_start": "2025-08-01T00:00:00Z",
  "period_end": "2025-08-31T23:59:59Z"
}
```

#### Get Analytics Data
```bash
GET https://helpninja.app/api/usage-stats
Authorization: Bearer sk_your_secret_key_here
```

## Webhook System

### Webhook Events
Your platform dispatches these webhook events:

- `conversation.started` - New conversation created
- `message.sent` - Message sent (user or assistant)
- `escalation.triggered` - AI escalated to human
- `document.ingested` - Content successfully indexed

### Webhook Endpoints Management

#### Create Webhook Endpoint
```bash
POST https://helpninja.app/api/webhooks
Authorization: Bearer sk_your_secret_key_here
Content-Type: application/json

{
  "name": "Slack Notifications",
  "url": "https://your-app.com/webhooks/helpninja",
  "events": ["conversation.started", "escalation.triggered"],
  "secret": "your-webhook-secret"
}
```

#### List Webhook Endpoints
```bash
GET https://helpninja.app/api/webhooks
Authorization: Bearer sk_your_secret_key_here
```

#### Test Webhook
```bash
POST https://helpninja.app/api/webhooks/{webhook_id}/test
Authorization: Bearer sk_your_secret_key_here
```

### Webhook Payload Examples

#### conversation.started
```json
{
  "event": "conversation.started",
  "timestamp": "2025-08-13T10:30:00Z",
  "tenant_id": "tenant-uuid",
  "data": {
    "conversation_id": "conv-uuid",
    "session_id": "session-123",
    "created_at": "2025-08-13T10:30:00Z"
  }
}
```

#### message.sent
```json
{
  "event": "message.sent", 
  "timestamp": "2025-08-13T10:31:00Z",
  "tenant_id": "tenant-uuid",
  "data": {
    "message_id": "msg-uuid",
    "conversation_id": "conv-uuid",
    "role": "user",
    "content": "How do I reset my password?",
    "confidence": 1.0
  }
}
```

#### escalation.triggered
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

### Webhook Security

#### Signature Verification
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
    
  return `sha256=${computedSignature}` === signature;
}

// Express.js example
app.post('/webhooks/helpninja', (req, res) => {
  const signature = req.headers['x-helpninja-signature'];
  const isValid = verifyWebhookSignature(
    JSON.stringify(req.body), 
    signature, 
    process.env.HELPNINJA_WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
});
```

## API Permissions

### Permission Levels
- `admin` - Full access to all endpoints
- `chat` - Conversation and messaging operations
- `content` - Document and source management  
- `team` - Team member and invitation management
- `analytics` - Usage statistics and reporting
- `webhooks` - Webhook endpoint management

### Rate Limiting
- Default: 1,000 requests per hour per API key
- Configurable per key in dashboard
- Rate limit headers included in responses:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 950
  X-RateLimit-Reset: 1692015600
  ```

## Error Handling

### Standard Error Response
```json
{
  "error": "invalid_request",
  "message": "The session_id field is required",
  "details": {
    "field": "session_id",
    "code": "missing_required_field"
  }
}
```

### Common Error Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Rate Limited (too many requests)
- `500` - Internal Server Error

## SDK Examples

### JavaScript/Node.js
```javascript
class HelpNinjaAPI {
  constructor(apiKey, baseUrl = 'https://helpninja.app/api') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  async createConversation(sessionId, metadata = {}) {
    const response = await fetch(`${this.baseUrl}/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_id: sessionId, metadata })
    });
    
    return response.json();
  }
  
  async sendMessage(tenantId, sessionId, message) {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        tenantId, 
        sessionId, 
        message 
      })
    });
    
    return response.json();
  }
}

// Usage
const api = new HelpNinjaAPI('sk_your_secret_key');
const conversation = await api.createConversation('session-123');
```

### Python
```python
import requests

class HelpNinjaAPI:
    def __init__(self, api_key, base_url='https://helpninja.app/api'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def create_conversation(self, session_id, metadata=None):
        payload = {'session_id': session_id}
        if metadata:
            payload['metadata'] = metadata
            
        response = requests.post(
            f'{self.base_url}/conversations',
            headers=self.headers,
            json=payload
        )
        return response.json()
    
    def send_message(self, tenant_id, session_id, message):
        payload = {
            'tenantId': tenant_id,
            'sessionId': session_id, 
            'message': message
        }
        
        response = requests.post(
            f'{self.base_url}/chat',
            json=payload
        )
        return response.json()

# Usage  
api = HelpNinjaAPI('sk_your_secret_key')
conversation = api.create_conversation('session-123')
```

## Migration to api.helpninja.app

### Phase 1: Current State
All endpoints at `https://helpninja.app/api/*`

### Phase 2: Versioned API (Recommended)
```bash
# Version 1 (stable)
https://api.helpninja.app/v1/conversations

# Version 2 (future)  
https://api.helpninja.app/v2/conversations
```

### Phase 3: API-First Architecture
- Dedicated API infrastructure
- Improved rate limiting 
- API-specific monitoring
- Better caching strategies

## Developer Portal Integration

### Documentation Site Structure
```
https://helpninja.app/developers/
├── docs/
│   ├── getting-started
│   ├── authentication  
│   ├── chat-api
│   ├── webhooks
│   ├── team-management
│   └── examples
├── playground/
│   ├── api-explorer
│   └── webhook-tester
└── account/
    ├── api-keys
    ├── usage
    └── webhooks
```

### Interactive API Explorer
Implement a Swagger/OpenAPI interface at:
`https://helpninja.app/developers/playground`

### Code Generation
Provide auto-generated SDKs for:
- JavaScript/TypeScript
- Python  
- PHP
- Go
- Ruby

## Implementation Recommendations

### Immediate Actions (Week 1)
1. **Create Developer Portal Pages**:
   - `/developers` - Landing page
   - `/developers/docs` - API documentation
   - `/developers/playground` - Interactive testing

2. **Fix Current Endpoints**:
   - Add CORS headers for API calls
   - Standardize error responses
   - Add rate limit headers

3. **API Key Management Enhancement**:
   - Improve key generation UI
   - Add permission selection
   - Show usage statistics

### Short-term (Month 1)
1. **API Versioning**:
   - Add `/api/v1/` prefix to all endpoints
   - Maintain backward compatibility
   - Version negotiation headers

2. **Enhanced Documentation**:
   - Interactive Swagger UI
   - Code examples for all endpoints  
   - Webhook payload schemas

3. **SDK Development**:
   - Official JavaScript SDK
   - Python SDK
   - Documentation with examples

### Long-term (Month 3)
1. **Dedicated API Subdomain**:
   - Set up `api.helpninja.app`
   - API-specific infrastructure
   - Advanced rate limiting

2. **GraphQL API**:
   - Alternative query interface
   - Real-time subscriptions
   - Nested resource fetching

This specification provides everything needed for your developer portal and positions helpNINJA as an enterprise-ready platform with professional API standards.
