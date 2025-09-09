# helpNINJA Documentation Hub

*Complete documentation for the helpNINJA AI customer support platform*

## 🚀 Quick Start

### For Developers & Integrators
- **[Widget Integration Guide](widget-comprehensive-guide.md)** - Complete widget setup and customization
- **[AI Agent Integration Guide](ai-agent-integration-guide.md)** - For AI assistants and agents
- **[Developer API Reference](developer-api-specification.md)** - Detailed API documentation
- **[Interactive API Docs](api-docs.html)** - Swagger UI interface

### For System Architecture
- **[User Message Flow](user-message-flow.md)** - Complete system message processing flow
- **[Complete Features Inventory](complete-features.md)** - All implemented features
- **[Development Documentation](development/)** - Technical implementation details

---

## 📚 Documentation Categories

### 🔌 Integration & Setup
| Document | Purpose | Audience |
|----------|---------|----------|
| [**Widget Comprehensive Guide**](widget-comprehensive-guide.md) | Complete widget integration for all platforms | Developers, Web Admins |
| [**AI Agent Integration**](ai-agent-integration-guide.md) | AI assistant integration patterns | AI Engineers, Developers |
| [**Developer API Specification**](developer-api-specification.md) | Detailed API reference and examples | Backend Developers |

### 🏗️ System Architecture  
| Document | Purpose | Audience |
|----------|---------|----------|
| [**User Message Flow**](user-message-flow.md) | Complete message processing pipeline | Developers, System Architects |
| [**Complete Features**](complete-features.md) | Feature inventory and implementation status | Product, Engineering |
| [**Development Documentation**](development/) | Technical implementation details | Engineering Team |

### 📋 Product & Business
| Document | Purpose | Audience |
|----------|---------|----------|
| [**PRD (Product Requirements)**](prd.md) | Product requirements and scope | Product, Engineering |
| [**Marketing Content**](marketing-content.md) | Marketing copy and messaging | Marketing Team |
| [**Pricing Strategy**](pricing.md) | Pricing model and plans | Business, Sales |

### 🎨 Design & UX
| Document | Purpose | Audience |
|----------|---------|----------|
| [**UI Recommendations**](ui-recommendations.md) | Interface design guidelines | Design, Frontend |
| [**Screenshot Capture Guide**](screenshot-capture-guide.md) | Documentation asset creation | Content, Marketing |
| [**Sitemap**](sitemap.md) | Site structure and navigation | Product, UX |

---

## 🔗 Interactive Resources

### Live API Documentation
- **[Interactive API Docs](https://helpninja.app/api-docs.html)** - Swagger UI with live testing
- **[OpenAPI JSON](openapi.json)** - Machine-readable API specification  
- **[OpenAPI YAML](openapi.yaml)** - Human-readable API specification

### Import into Development Tools
- **Postman**: Import [`openapi.json`](openapi.json) to generate request collection
- **Insomnia**: Import [`openapi.yaml`](openapi.yaml) for request templates
- **VS Code**: Use with REST Client and OpenAPI extensions
- **curl**: Generate curl commands from the specifications

---

## 📖 API Overview & Usage

The helpNINJA API provides comprehensive functionality for AI customer support:

### 🤖 **Chat & Conversations**
- Send messages to AI assistant (`/chat`, `/chat-api`)
- RAG-powered responses with intent classification  
- Automatic escalation for low-confidence answers
- Conversation management and persistence

### 📄 **Content Management**
- Ingest content from URLs and sitemaps (`/ingest`) 
- Document chunking and embedding generation
- PostgreSQL + pgvector hybrid search
- Source management and analytics

### 🔔 **Webhooks & Events**
- Real-time event notifications (`/webhooks`)
- HMAC SHA-256 signature verification
- Events: conversation.started, message.sent, escalation.triggered

### 📊 **Usage & Analytics**
- Usage limits and tracking (`/usage`)
- Conversation metrics (`/usage-stats`)
- Response confidence analytics

### 💰 **Billing & Plans**
- Stripe checkout sessions (`/billing/checkout`)
- Customer portal access (`/billing/portal`)
- Multi-tier plan management

### 🎨 **Widget Delivery**
- JavaScript widget delivery (`/widget`)
- Site-specific configuration
- Cross-domain CORS support

---

## 🔐 Authentication & Security

### API Key Types
```bash
pk_*  # Public keys (client-side safe, widget integration)
sk_*  # Secret keys (server-side only, full API access)  
whk_* # Webhook keys (webhook endpoint authentication)
```

### Authentication Methods
```bash
# Bearer Token (recommended)
curl -H "Authorization: Bearer sk_your_api_key" \
  "https://helpninja.app/api/usage"

# API Key Header
curl -H "X-API-Key: sk_your_api_key" \
  "https://helpninja.app/api/conversations"
```

### Rate Limiting
- **Limit**: 1,000 requests per hour per API key
- **Headers**: Rate limit info in `X-RateLimit-*` headers
- **Response**: 429 when exceeded with retry information

---

## 🚀 Quick Integration Examples

### Widget Integration
```html
<script>
  window.helpNINJAConfig = {
    tenantId: "pk_your_tenant_key",
    siteId: "your_site_id",
    verificationToken: "your_verification_token",
    voice: "friendly"
  };
</script>
<script src="https://helpninja.app/api/widget?t=pk_your_tenant_key&s=your_site_id&k=your_verification_token" async></script>
```

### API Usage (JavaScript)
```javascript
// Send a chat message
const response = await fetch('https://helpninja.app/api/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tenantId: 'your_tenant_id',
    sessionId: 'session_uuid',
    message: 'How can I help?'
  })
});
```

### Python SDK Example
```python
import requests

headers = {'Authorization': 'Bearer sk_your_api_key'}
usage = requests.get('https://helpninja.app/api/usage', headers=headers)
print(usage.json())
```

---

## 🌐 Environment & Deployment

### API Endpoints
- **Production**: `https://helpninja.app/api`
- **Development**: `http://localhost:3001/api`

### Status & Monitoring
- **Status Page**: [status.helpninja.app](https://status.helpninja.app)
- **Health Check**: `GET /api/health`

---

## 📞 Support & Resources

### Documentation Links
- **[Complete Widget Guide](widget-comprehensive-guide.md)** - Comprehensive widget integration
- **[API Reference](developer-api-specification.md)** - Detailed endpoint documentation
- **[Message Flow](user-message-flow.md)** - System architecture overview

### Getting Help
- **Support Portal**: [helpninja.app/support](https://helpninja.app/support)
- **Status Updates**: [status.helpninja.app](https://status.helpninja.app)
- **Developer Community**: [GitHub Discussions](https://github.com/wize-works/helpNINJA/discussions)

---

*Last updated: September 2025 | Version: 1.0.0*
