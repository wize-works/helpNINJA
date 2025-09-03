# helpNINJA AI Agent Integration Guide

*A comprehensive guide for AI assistants and developers on how to integrate with helpNINJA*

## Overview

helpNINJA is a Next.js 15 (App Router) application that provides an AI chat widget with RAG search capabilities, Stripe billing, and pluggable escalations. This guide is specifically designed for AI agents and developers using AI assistants to understand and integrate with the helpNINJA platform.

### Quick Start for AI Agents

1. **Widget Integration**: Add the chat widget to any website
2. **API Access**: Use REST APIs for programmatic access
3. **Webhooks**: Receive real-time notifications
4. **Content Ingestion**: Automatically index documentation and content

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chat Widget   │───▶│  helpNINJA API  │───▶│   AI + RAG      │
│  (Client-side)  │    │  (Next.js App)  │    │   (OpenAI)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │  + pgvector     │
                    │  + tsvector     │
                    └─────────────────┘
```

## 1. Widget Integration

### Quick Setup (Any Website)
```html
<!-- Place before closing </body> tag -->
<script>
  window.helpNINJAConfig = {
    tenantId: "pk_your_tenant_key",
    siteId: "your_site_id", 
    verificationToken: "your_verification_token",
    voice: "friendly"
  };
  var s = document.createElement("script");
  s.src = "https://helpninja.app/api/widget?t=pk_your_tenant_key&s=your_site_id&k=your_verification_token&voice=friendly";
  s.async = true;
  document.head.appendChild(s);
</script>
```

### React/Next.js Component
```jsx
'use client';
import { useEffect } from 'react';

export default function HelpNinjaWidget() {
  useEffect(() => {
    window.helpNINJAConfig = {
      tenantId: "pk_your_tenant_key",
      siteId: "your_site_id",
      verificationToken: "your_verification_token",
      voice: "friendly"
    };
    
    const script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget?t=pk_your_tenant_key&s=your_site_id&k=your_verification_token&voice=friendly";
    script.async = true;
    document.head.appendChild(script);
  }, []);
  
  return null;
}
```

### Widget Configuration Options
```javascript
window.helpNINJAConfig = {
  // Required
  tenantId: "pk_...",           // Your public tenant key
  siteId: "...",               // Site UUID from dashboard
  verificationToken: "...",     // Site verification token (NOT script_key)
  
  // Optional Customization
  voice: "friendly",           // "friendly", "professional", "casual", "formal"
  primaryColor: "#7C3AED",     // Brand color
  position: "bottom-right",    // "bottom-left", "bottom-right"
  theme: "auto",              // "light", "dark", "auto"
  welcomeMessage: "Hi! How can I help?",
  aiName: "AI Assistant",
  showBranding: true,         // Show helpNINJA branding
  autoOpenDelay: 0            // Auto-open delay (0 = disabled)
};
```

## 2. API Integration

### Authentication
```javascript
// All API requests use Bearer token authentication
const headers = {
  'Authorization': 'Bearer sk_your_secret_key',
  'Content-Type': 'application/json'
};
```

### Core API Endpoints

#### Send Chat Message (Widget Endpoint)
```javascript
POST https://helpninja.app/api/chat

{
  "tenantId": "pk_your_tenant_key",
  "sessionId": "unique-session-id",  
  "message": "How do I reset my password?",
  "voice": "friendly"
}

// Response
{
  "answer": "To reset your password, click the 'Forgot Password' link...",
  "refs": ["https://your-site.com/help/password-reset"],
  "confidence": 0.85,
  "source": "ai"
}
```

#### Ingest Content
```javascript
POST https://helpninja.app/api/ingest
Authorization: Bearer sk_your_secret_key

{
  "input": "https://your-website.com/help",  // URL or sitemap
  "siteId": "site-uuid-optional"
}

// Response  
{
  "message": "Ingestion started",
  "documentsIngested": 15,
  "chunksCreated": 142,
  "tokensEmbedded": 28439
}
```

#### List Conversations
```javascript
GET https://helpninja.app/api/conversations?limit=20&offset=0
Authorization: Bearer sk_your_secret_key

// Response
{
  "conversations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "session_id": "unique-session-id",
      "created_at": "2025-08-13T10:30:00Z",
      "message_count": 6,
      "last_message_at": "2025-08-13T10:35:00Z"
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "count": 1 }
}
```

#### Usage Statistics
```javascript
GET https://helpninja.app/api/usage
Authorization: Bearer sk_your_secret_key

// Response
{
  "used": 245,
  "limit": 5000, 
  "plan": "pro",
  "period_start": "2025-08-01T00:00:00Z",
  "period_end": "2025-08-31T23:59:59Z"
}
```

## 3. Webhook System

### Available Events
- `conversation.started` - New conversation created
- `message.sent` - Message sent (user or assistant) 
- `escalation.triggered` - AI escalated to human support
- `document.ingested` - Content successfully indexed

### Webhook Setup
```javascript
POST https://helpninja.app/api/webhooks
Authorization: Bearer sk_your_secret_key

{
  "name": "My App Notifications",
  "url": "https://your-app.com/webhooks/helpninja",
  "events": ["conversation.started", "escalation.triggered"],
  "secret": "your-webhook-secret"
}
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

### Webhook Security (Signature Verification)
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
  
  // Process webhook event...
  const { event, data } = req.body;
  
  switch (event) {
    case 'conversation.started':
      // Handle new conversation
      break;
    case 'escalation.triggered':
      // Handle escalation to human support
      break;
    case 'message.sent':
      // Handle message events
      break;
    case 'document.ingested':
      // Handle content ingestion completion
      break;
  }
  
  res.status(200).send('OK');
});
```

## 4. Integration Patterns for AI Agents

### Pattern 1: Customer Support Bot
```javascript
class CustomerSupportIntegration {
  constructor(helpNinjaApiKey, slackWebhookUrl) {
    this.apiKey = helpNinjaApiKey;
    this.slackWebhook = slackWebhookUrl;
  }
  
  // Handle escalations via webhook
  async handleEscalation(webhookPayload) {
    const { conversation_id, user_message, confidence } = webhookPayload.data;
    
    // Notify support team via Slack
    await fetch(this.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 helpNINJA Escalation Required`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn", 
              text: `*User Question:* ${user_message}\n*Confidence:* ${confidence}\n*Conversation ID:* ${conversation_id}`
            }
          }
        ]
      })
    });
  }
  
  // Automatically ingest new documentation
  async ingestNewDocs(urls) {
    for (const url of urls) {
      await fetch('https://helpninja.app/api/ingest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: url })
      });
    }
  }
}
```

### Pattern 2: Multi-Site Management
```javascript
class MultiSiteManager {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  
  // Deploy widget to multiple sites with different configs
  async deployWidget(sites) {
    const deployments = sites.map(site => ({
      tenantId: this.tenantId,
      siteId: site.id,
      verificationToken: site.verification_token,
      config: {
        voice: site.voice || 'friendly',
        primaryColor: site.brand_color,
        welcomeMessage: site.welcome_message,
        aiName: site.ai_name
      }
    }));
    
    return deployments;
  }
  
  // Monitor usage across all sites
  async getUsageReport() {
    const response = await fetch('https://helpninja.app/api/usage-stats', {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.json();
  }
}
```

### Pattern 3: Content Pipeline Integration
```javascript
class ContentPipeline {
  constructor(helpNinjaApiKey) {
    this.apiKey = helpNinjaApiKey;
  }
  
  // Auto-ingest when documentation is updated
  async handleContentUpdate(event) {
    if (event.type === 'documentation_updated') {
      await this.ingestContent(event.url);
      await this.validateIngestion(event.url);
    }
  }
  
  async ingestContent(url) {
    const response = await fetch('https://helpninja.app/api/ingest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: url })
    });
    
    return response.json();
  }
  
  async validateIngestion(url) {
    // Wait for ingestion to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test a sample question
    const testResponse = await fetch('https://helpninja.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: 'pk_your_tenant_key',
        sessionId: 'validation-test',
        message: 'Test question about the new content'
      })
    });
    
    const result = await testResponse.json();
    
    if (result.confidence < 0.7) {
      console.warn('Low confidence after ingestion. Content may need review.');
    }
  }
}
```

## 5. Error Handling & Best Practices

### Standard Error Response Format
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

### Rate Limiting
- Default: 1,000 requests per hour per API key
- Headers included in responses:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 950
  X-RateLimit-Reset: 1692015600
  ```

### Best Practices for AI Agents

1. **Always check usage limits** before making API calls
2. **Use webhooks** instead of polling for real-time events
3. **Implement signature verification** for webhook security
4. **Handle rate limits gracefully** with exponential backoff
5. **Use unique session IDs** for different user conversations
6. **Monitor confidence scores** to identify content gaps
7. **Test widget integration** in different environments

### Common Integration Issues

#### Widget Not Loading
```javascript
// Check these items:
// 1. Verify domain is registered and verified in helpNINJA dashboard
// 2. Ensure verification_token (not script_key) is used
// 3. Check browser console for CORS errors
// 4. Confirm tenant is active and not suspended

// Debug script:
console.log('helpNINJA Config:', window.helpNINJAConfig);
console.log('Widget Script Loaded:', !!document.querySelector('script[src*="helpninja.app"]'));
```

#### API Authentication Errors
```javascript
// Verify API key format and permissions
const validateApiKey = (key) => {
  if (!key.startsWith('sk_')) {
    throw new Error('Invalid API key format. Must start with sk_');
  }
  if (key.length < 30) {
    throw new Error('API key appears to be truncated');
  }
  return true;
};
```

#### Low Confidence Responses
```javascript
// Monitor confidence scores and trigger content review
const handleLowConfidence = async (response) => {
  if (response.confidence < 0.6) {
    // Log for content team review
    console.warn(`Low confidence response: ${response.confidence}`);
    
    // Could trigger webhook to content team
    await fetch('/internal/content-review', {
      method: 'POST',
      body: JSON.stringify({
        question: response.question,
        confidence: response.confidence,
        response: response.answer
      })
    });
  }
};
```

## 6. SDK Examples

### JavaScript/Node.js SDK
```javascript
class HelpNinjaSDK {
  constructor(apiKey, baseUrl = 'https://helpninja.app/api') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }
  
  async chat(tenantId, sessionId, message, voice = 'friendly') {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, sessionId, message, voice })
    });
    return response.json();
  }
  
  async ingest(input, siteId = null) {
    const body = { input };
    if (siteId) body.siteId = siteId;
    
    const response = await fetch(`${this.baseUrl}/ingest`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    });
    return response.json();
  }
  
  async getUsage() {
    const response = await fetch(`${this.baseUrl}/usage`, {
      headers: this.headers
    });
    return response.json();
  }
  
  async createWebhook(name, url, events, secret) {
    const response = await fetch(`${this.baseUrl}/webhooks`, {
      method: 'POST', 
      headers: this.headers,
      body: JSON.stringify({ name, url, events, secret })
    });
    return response.json();
  }
}

// Usage
const helpNinja = new HelpNinjaSDK('sk_your_secret_key');
const result = await helpNinja.chat('pk_tenant', 'session-123', 'Hello!');
```

### Python SDK
```python
import requests
import hashlib
import hmac
import json

class HelpNinjaSDK:
    def __init__(self, api_key, base_url='https://helpninja.app/api'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def chat(self, tenant_id, session_id, message, voice='friendly'):
        response = requests.post(
            f'{self.base_url}/chat',
            json={
                'tenantId': tenant_id,
                'sessionId': session_id,
                'message': message,
                'voice': voice
            }
        )
        return response.json()
    
    def ingest(self, input_url, site_id=None):
        data = {'input': input_url}
        if site_id:
            data['siteId'] = site_id
            
        response = requests.post(
            f'{self.base_url}/ingest',
            headers=self.headers,
            json=data
        )
        return response.json()
    
    def verify_webhook(self, payload, signature, secret):
        """Verify webhook signature"""
        computed = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f'sha256={computed}' == signature

# Usage
help_ninja = HelpNinjaSDK('sk_your_secret_key')
result = help_ninja.chat('pk_tenant', 'session-123', 'Hello!')
```

## 7. Development Environment Setup

### Local Development
```bash
# Clone the helpNINJA repository (for contributors)
git clone https://github.com/your-org/helpninja.git
cd helpninja

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Required environment variables:
# OPENAI_API_KEY=your_openai_key
# DATABASE_URL=postgresql://...
# STRIPE_SECRET_KEY=sk_test_...
# SITE_URL=http://localhost:3001

# Run development server
npm run dev
```

### Testing Widget Integration
```html
<!DOCTYPE html>
<html>
<head>
    <title>helpNINJA Widget Test</title>
</head>
<body>
    <h1>Test Page</h1>
    <p>The widget should appear in the bottom-right corner.</p>
    
    <script>
      window.helpNINJAConfig = {
        tenantId: "pk_test_your_key",
        siteId: "your_test_site_id",
        verificationToken: "your_verification_token",
        voice: "friendly"
      };
      var s = document.createElement("script");
      s.src = "http://localhost:3001/api/widget?t=pk_test_your_key&s=your_test_site_id&k=your_verification_token";
      s.async = true;
      document.head.appendChild(s);
    </script>
</body>
</html>
```

## 8. Deployment Considerations

### Production URLs
- Main App: `https://helpninja.app`
- API Endpoints: `https://helpninja.app/api/*`
- Widget Script: `https://helpninja.app/api/widget`

### CORS Configuration
All widget endpoints support CORS for cross-domain requests:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

### Security Headers
```javascript
// Example security headers for webhook endpoints
app.use('/webhooks', (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  next();
});
```

## 9. Monitoring & Analytics

### Usage Tracking
```javascript
// Monitor API usage programmatically
const monitorUsage = async (apiKey) => {
  const response = await fetch('https://helpninja.app/api/usage', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  
  const usage = await response.json();
  
  if (usage.used / usage.limit > 0.8) {
    // Alert: approaching usage limit
    console.warn('Approaching usage limit:', usage);
  }
  
  return usage;
};
```

### Widget Performance
```javascript
// Monitor widget load performance
window.helpNINJAConfig = {
  tenantId: "pk_your_key",
  siteId: "your_site_id", 
  verificationToken: "your_token",
  onLoad: () => {
    console.log('helpNINJA widget loaded successfully');
  },
  onError: (error) => {
    console.error('helpNINJA widget load error:', error);
  }
};
```

## Summary

This guide provides everything an AI agent needs to successfully integrate with helpNINJA:

1. **Widget Integration**: Add the chat widget to any website with customizable appearance and behavior
2. **API Access**: Full REST API for programmatic access to conversations, content, and analytics
3. **Webhooks**: Real-time notifications for conversation events and escalations
4. **Content Management**: Automated ingestion and indexing of documentation
5. **Security**: Proper authentication, CORS support, and webhook signature verification
6. **Error Handling**: Comprehensive error responses and best practices
7. **SDKs**: Ready-to-use code examples in JavaScript and Python

For additional help or questions, refer to the detailed API documentation at `/docs/developer-api-specification.md` or the widget-specific guides in the `/docs/` directory.
