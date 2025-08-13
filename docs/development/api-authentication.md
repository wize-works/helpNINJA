# API Authentication Guide

## Overview

The helpNINJA API supports two authentication methods:
1. **API Keys** - For programmatic access
2. **Session Authentication** - For dashboard/UI access

## API Key Authentication

### Creating API Keys

1. Navigate to **Dashboard → Settings → API**
2. Click **Create API Key**
3. Configure:
   - **Name**: Descriptive name for the key
   - **Type**: 
     - `public` - For widget/frontend use
     - `secret` - For backend/server use
     - `webhook` - For webhook endpoints
   - **Permissions**: Select specific permissions
   - **Rate Limit**: Requests per hour (default: 1000)
   - **Expires**: Optional expiration date

### Using API Keys

#### Authorization Header (Recommended)
```bash
curl -H "Authorization: Bearer your_api_key_here" \
  https://your-domain.com/api/conversations
```

#### X-API-Key Header
```bash
curl -H "X-API-Key: your_api_key_here" \
  https://your-domain.com/api/conversations
```

#### Query Parameter (Less Secure)
```bash
curl "https://your-domain.com/api/conversations?api_key=your_api_key_here"
```

## Protected Endpoints

### Requires API Key Only (No Session Fallback)

These endpoints require a valid API key and don't accept session authentication:

#### `/api/conversations` - Chat Management
- **POST** - Create conversation (requires `chat` permission)
- **GET** - List conversations (requires `chat` permission)

```bash
# Create a conversation
curl -X POST \
  -H "Authorization: Bearer sk_test_..." \
  -H "Content-Type: application/json" \
  -d '{"session_id": "user_123", "metadata": {"source": "mobile"}}' \
  https://your-domain.com/api/conversations

# List conversations
curl -H "Authorization: Bearer sk_test_..." \
  "https://your-domain.com/api/conversations?limit=10&offset=0"
```

### Supports Both API Key and Session Auth

#### `/api/usage-stats` - Analytics
- **GET** - Get usage statistics (requires `analytics` permission)

```bash
# Using API key
curl -H "Authorization: Bearer sk_test_..." \
  https://your-domain.com/api/usage-stats

# Using session (when logged into dashboard)
curl -H "Cookie: session_cookie=..." \
  https://your-domain.com/api/usage-stats
```

## Permission System

### Available Permissions

- **`admin`** - Full access to all resources
- **`chat`** - Access to chat/conversation APIs
- **`analytics`** - Access to usage and analytics data
- **`webhooks`** - Manage webhook endpoints
- **`documents`** - Manage knowledge base documents
- **`sites`** - Manage sites and crawling

### Permission Inheritance

- `admin` permission grants access to all other permissions
- Multiple specific permissions can be assigned to a single key

## Rate Limiting

- Each API key has a configurable rate limit (requests per hour)
- Rate limits are enforced per API key
- Default limit: 1000 requests/hour
- Rate limit headers are included in responses:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 999
  X-RateLimit-Reset: 1640995200
  ```

## Error Handling

### Authentication Errors

```json
// Missing or invalid API key
{
  "error": "Invalid or expired API key"
}

// Missing required permission
{
  "error": "Missing required permission: chat"
}

// Rate limit exceeded
{
  "error": "Rate limit exceeded"
}
```

### HTTP Status Codes

- **401** - Authentication required/invalid
- **403** - Permission denied
- **429** - Rate limit exceeded
- **500** - Server error

## Security Best Practices

1. **Keep API Keys Secret**: Never expose API keys in client-side code
2. **Use Appropriate Key Types**: 
   - `public` keys for frontend widgets
   - `secret` keys for backend services
   - `webhook` keys for webhook endpoints
3. **Principle of Least Privilege**: Grant minimal required permissions
4. **Key Rotation**: Regularly rotate API keys
5. **Monitor Usage**: Check API usage logs regularly
6. **Set Expiration**: Use expiration dates for temporary access

## Testing API Keys

Use the built-in test functionality in the dashboard:

1. Go to **Dashboard → Settings → API**
2. Click the **⋯** menu next to any API key
3. Select **Test** to verify the key works

## Examples

### Complete Chat Integration

```javascript
// Backend service using secret key
const apiKey = process.env.HELPNINJA_SECRET_KEY;

async function createConversation(sessionId) {
  const response = await fetch('https://your-domain.com/api/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      session_id: sessionId,
      metadata: { source: 'backend' }
    })
  });
  
  return response.json();
}

async function getUsageStats() {
  const response = await fetch('https://your-domain.com/api/usage-stats', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  return response.json();
}
```

### Widget Integration

```javascript
// Frontend widget using public key
const publicKey = 'pk_live_...';

async function sendMessage(message, sessionId) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'X-API-Key': publicKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      sessionId,
      tenantId: 'your-tenant-id'
    })
  });
  
  return response.json();
}
```

## Migration Guide

### From Session Auth to API Keys

1. Create appropriate API keys with required permissions
2. Update your application to use API key authentication
3. Test thoroughly in development
4. Deploy with proper environment variable management
5. Monitor API usage and adjust rate limits as needed
