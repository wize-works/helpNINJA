# Custom Integrations

Build powerful custom integrations with helpNINJA's comprehensive API to connect with any system, create unique workflows, and extend platform functionality beyond standard integrations. This guide covers everything from simple webhooks to complex enterprise integrations.

## Overview

### What are Custom Integrations?

Custom integrations with helpNINJA enable:
- **API-First Architecture**: RESTful APIs for complete platform access
- **Real-Time Webhooks**: Instant notifications for conversation events
- **Custom Workflows**: Build unique business processes around conversations
- **System Connectivity**: Connect with any third-party system or internal tool
- **Data Transformation**: Process and route conversation data as needed
- **White-Label Solutions**: Build helpNINJA into your own products

### Why Build Custom Integrations?

**Unique Business Requirements**: Standard integrations don't meet your specific needs
**Proprietary Systems**: Connect with internal or legacy systems
**Advanced Workflows**: Create complex, multi-step business processes
**Product Integration**: Embed helpNINJA functionality into your products
**Data Processing**: Transform and route conversation data to multiple systems
**Competitive Advantage**: Build unique capabilities that differentiate your business

---

## helpNINJA API Overview

### API Architecture

**RESTful Design:**
```
API Base URL: https://helpninja.app/v1/
Authentication: Bearer token (API key)
Response Format: JSON
Request Methods: GET, POST, PUT, DELETE
Rate Limiting: 1000 requests/hour (Starter), 5000/hour (Pro), 10000/hour (Agency)
```

**Core API Endpoints:**
```
Conversations:
├── GET /conversations - List conversations
├── GET /conversations/{id} - Get conversation details
├── POST /conversations/{id}/messages - Add message to conversation
├── PUT /conversations/{id}/status - Update conversation status
└── DELETE /conversations/{id} - Delete conversation (where allowed)

Tenants:
├── GET /tenants/{id} - Get tenant information
├── PUT /tenants/{id} - Update tenant settings
├── GET /tenants/{id}/analytics - Get usage analytics
└── POST /tenants/{id}/documents - Upload documents

Messages:
├── GET /messages/{id} - Get message details
├── POST /messages/{id}/feedback - Submit message feedback
└── PUT /messages/{id}/satisfaction - Update satisfaction rating

Documents:
├── GET /documents - List documents
├── POST /documents - Upload document
├── PUT /documents/{id} - Update document
└── DELETE /documents/{id} - Delete document

Integrations:
├── GET /integrations - List available integrations
├── POST /integrations/{type}/configure - Configure integration
├── PUT /integrations/{id} - Update integration settings
└── DELETE /integrations/{id} - Remove integration
```

### Authentication

**API Key Authentication:**
```javascript
// Request Headers
{
  "Authorization": "Bearer hnja_live_1234567890abcdef",
  "Content-Type": "application/json",
  "X-Tenant-ID": "tenant_abc123" // Required for multi-tenant operations
}
```

**API Key Management:**
```
Key Types:
├── Live Keys: Production environment access
├── Test Keys: Development and testing environment
├── Restricted Keys: Limited scope for specific operations
└── Webhook Keys: Special keys for webhook validation

Key Scopes:
├── conversations:read - Read conversation data
├── conversations:write - Create and update conversations
├── documents:read - Access document library
├── documents:write - Upload and manage documents
├── analytics:read - Access usage and performance data
├── integrations:manage - Configure integrations
└── admin:full - Complete administrative access
```

---

## Webhook Integration

### Setting Up Webhooks

**Webhook Configuration:**
```javascript
// Configure webhook endpoint
POST /api/webhooks
{
  "url": "https://yourapp.com/webhooks/helpninja",
  "events": [
    "conversation.started",
    "conversation.ended", 
    "conversation.escalated",
    "message.sent",
    "satisfaction.received"
  ],
  "secret": "your_webhook_secret_for_validation",
  "active": true
}
```

**Webhook Event Types:**
```
Conversation Events:
├── conversation.started - New conversation begins
├── conversation.ended - Conversation completes
├── conversation.escalated - Escalated to human agent
├── conversation.resolved - Marked as resolved
└── conversation.abandoned - Customer left without resolution

Message Events:
├── message.sent - New message (customer or AI)
├── message.failed - Message delivery failed
├── ai.response.low_confidence - AI response below threshold
└── ai.response.high_confidence - AI very confident in response

Customer Events:
├── customer.identified - Customer email/info captured
├── satisfaction.received - Customer satisfaction rating
├── feedback.submitted - Customer feedback provided
└── lead.qualified - Conversation meets lead criteria

System Events:
├── document.uploaded - New document added
├── integration.configured - New integration setup
├── usage.threshold_reached - Approaching usage limits
└── error.occurred - System error needs attention
```

### Webhook Payload Examples

**Conversation Started Event:**
```json
{
  "event": "conversation.started",
  "timestamp": "2025-09-03T15:30:00Z",
  "tenant_id": "tenant_abc123",
  "data": {
    "conversation_id": "conv_xyz789",
    "session_id": "session_def456",
    "site_url": "https://yoursite.com",
    "page_url": "https://yoursite.com/pricing",
    "referrer": "https://google.com/search",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.100",
    "country": "US",
    "language": "en",
    "initial_message": "I have a question about your pricing plans"
  }
}
```

**Message Sent Event:**
```json
{
  "event": "message.sent",
  "timestamp": "2025-09-03T15:31:15Z",
  "tenant_id": "tenant_abc123",
  "data": {
    "conversation_id": "conv_xyz789",
    "message_id": "msg_ghi012",
    "sender": "ai",
    "content": "I'd be happy to help you understand our pricing plans...",
    "confidence_score": 0.87,
    "sources": [
      {
        "document_id": "doc_jkl345",
        "title": "Pricing Plans Overview",
        "relevance_score": 0.92
      }
    ],
    "processing_time_ms": 1200,
    "tokens_used": 245
  }
}
```

**Conversation Escalated Event:**
```json
{
  "event": "conversation.escalated",
  "timestamp": "2025-09-03T15:35:22Z",
  "tenant_id": "tenant_abc123",
  "data": {
    "conversation_id": "conv_xyz789",
    "escalation_reason": "low_confidence",
    "confidence_score": 0.23,
    "customer_message": "I need to cancel my subscription immediately",
    "ai_attempted_response": "I can help you with account changes...",
    "escalation_triggers": [
      "billing_related",
      "cancellation_request",
      "confidence_below_threshold"
    ],
    "suggested_team_member": "support_agent_sarah",
    "priority": "high"
  }
}
```

### Webhook Security

**Signature Verification:**
```javascript
// Node.js webhook verification
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const providedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

// Express.js webhook handler
app.post('/webhooks/helpninja', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-helpninja-signature'];
  const payload = req.body;
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({error: 'Invalid signature'});
  }
  
  const event = JSON.parse(payload);
  
  // Process webhook event
  handleWebhookEvent(event);
  
  res.status(200).json({received: true});
});
```

---

## API Integration Examples

### Customer Support System Integration

**Automatic Ticket Creation:**
```javascript
// Listen for escalated conversations
app.post('/webhooks/helpninja', (req, res) => {
  const event = req.body;
  
  if (event.event === 'conversation.escalated') {
    createSupportTicket(event.data);
  }
  
  res.status(200).json({received: true});
});

async function createSupportTicket(conversationData) {
  // Get full conversation details
  const conversation = await fetch(`https://helpninja.app/v1/conversations/${conversationData.conversation_id}`, {
    headers: {
      'Authorization': `Bearer ${process.env.HELPNINJA_API_KEY}`,
      'X-Tenant-ID': conversationData.tenant_id
    }
  }).then(res => res.json());
  
  // Create ticket in your support system
  const ticket = await createTicketInSupportSystem({
    title: `Chat Escalation: ${conversation.first_message}`,
    description: formatConversationForTicket(conversation),
    priority: conversationData.priority,
    customer_email: conversation.customer_email,
    source: 'helpNINJA Chat Widget',
    tags: ['chat-escalation', 'ai-assisted'],
    custom_fields: {
      conversation_id: conversation.id,
      ai_confidence: conversationData.confidence_score,
      escalation_reason: conversationData.escalation_reason
    }
  });
  
  // Update helpNINJA with ticket reference
  await fetch(`https://helpninja.app/v1/conversations/${conversation.id}/metadata`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.HELPNINJA_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': conversationData.tenant_id
    },
    body: JSON.stringify({
      support_ticket_id: ticket.id,
      support_ticket_url: ticket.url
    })
  });
}
```

### CRM Lead Creation

**Qualified Lead Processing:**
```javascript
// Process lead qualification events
app.post('/webhooks/helpninja', (req, res) => {
  const event = req.body;
  
  if (event.event === 'lead.qualified') {
    processQualifiedLead(event.data);
  }
  
  res.status(200).json({received: true});
});

async function processQualifiedLead(leadData) {
  // Enrich lead data with conversation context
  const conversation = await getConversationDetails(leadData.conversation_id);
  const leadScore = calculateLeadScore(conversation);
  
  // Create lead in CRM
  const crmLead = {
    email: conversation.customer_email,
    first_name: extractFirstName(conversation.customer_name),
    last_name: extractLastName(conversation.customer_name),
    company: extractCompany(conversation.site_url),
    source: 'helpNINJA Chat Widget',
    lead_score: leadScore,
    notes: `Chat conversation: ${conversation.summary}\n\nTopics discussed: ${conversation.topics.join(', ')}`,
    custom_fields: {
      chat_confidence: conversation.avg_confidence,
      conversation_duration: conversation.duration_minutes,
      questions_asked: conversation.message_count,
      escalation_required: conversation.escalated
    }
  };
  
  const leadId = await createLeadInCRM(crmLead);
  
  // Trigger follow-up workflow
  await triggerCRMWorkflow('chat-lead-follow-up', leadId);
  
  // Send notification to sales team
  await notifySalesTeam({
    lead_id: leadId,
    conversation_url: `https://helpninja.app/conversations/${conversation.id}`,
    priority: leadScore > 75 ? 'high' : 'normal'
  });
}
```

### Analytics Data Pipeline

**Conversation Analytics:**
```javascript
// Real-time analytics processing
app.post('/webhooks/helpninja', (req, res) => {
  const event = req.body;
  
  // Process all events for analytics
  processAnalyticsEvent(event);
  
  res.status(200).json({received: true});
});

async function processAnalyticsEvent(event) {
  const analyticsData = {
    event_type: event.event,
    tenant_id: event.tenant_id,
    timestamp: event.timestamp,
    ...extractAnalyticsFields(event.data)
  };
  
  // Send to analytics pipeline
  await sendToAnalyticsPipeline(analyticsData);
  
  // Update real-time dashboards
  await updateRealTimeDashboard(analyticsData);
  
  // Check for alerts and thresholds
  await checkAnalyticsAlerts(analyticsData);
}

function extractAnalyticsFields(eventData) {
  return {
    conversation_id: eventData.conversation_id,
    session_id: eventData.session_id,
    site_url: eventData.site_url,
    page_url: eventData.page_url,
    country: eventData.country,
    language: eventData.language,
    confidence_score: eventData.confidence_score,
    processing_time_ms: eventData.processing_time_ms,
    tokens_used: eventData.tokens_used,
    escalation_reason: eventData.escalation_reason,
    satisfaction_score: eventData.satisfaction_score
  };
}
```

---

## Advanced Integration Patterns

### Multi-Tenant SaaS Integration

**Tenant-Aware Processing:**
```javascript
class HelpNinjaIntegration {
  constructor() {
    this.tenantConfigs = new Map();
    this.loadTenantConfigurations();
  }
  
  async handleWebhook(event) {
    const tenantConfig = this.tenantConfigs.get(event.tenant_id);
    
    if (!tenantConfig) {
      console.warn(`No configuration found for tenant: ${event.tenant_id}`);
      return;
    }
    
    // Route to tenant-specific handler
    const handler = this.getHandlerForTenant(event.tenant_id, event.event);
    await handler(event.data, tenantConfig);
  }
  
  getHandlerForTenant(tenantId, eventType) {
    const config = this.tenantConfigs.get(tenantId);
    
    switch (config.integration_type) {
      case 'salesforce':
        return this.salesforceHandlers[eventType];
      case 'hubspot':
        return this.hubspotHandlers[eventType];
      case 'custom':
        return this.customHandlers[tenantId][eventType];
      default:
        return this.defaultHandlers[eventType];
    }
  }
  
  async loadTenantConfigurations() {
    const tenants = await this.fetchTenantConfigs();
    
    for (const tenant of tenants) {
      this.tenantConfigs.set(tenant.id, {
        integration_type: tenant.integration_type,
        api_credentials: tenant.encrypted_credentials,
        webhook_settings: tenant.webhook_settings,
        custom_fields: tenant.custom_field_mappings,
        workflow_rules: tenant.workflow_rules
      });
    }
  }
}
```

### Event-Driven Architecture

**Event Processing Pipeline:**
```javascript
// Event processor with queuing and retry logic
class EventProcessor {
  constructor() {
    this.queue = new Bull('helpninja-events', {
      redis: { host: 'localhost', port: 6379 }
    });
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    // Process conversation events
    this.queue.process('conversation.*', 5, async (job) => {
      return this.processConversationEvent(job.data);
    });
    
    // Process message events with higher concurrency
    this.queue.process('message.*', 10, async (job) => {
      return this.processMessageEvent(job.data);
    });
    
    // Process lead events with priority
    this.queue.process('lead.qualified', 3, async (job) => {
      return this.processLeadEvent(job.data);
    });
  }
  
  async addEvent(event) {
    const jobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    };
    
    // Add priority for certain events
    if (event.event === 'lead.qualified' || event.event === 'conversation.escalated') {
      jobOptions.priority = 10;
    }
    
    await this.queue.add(event.event, event, jobOptions);
  }
  
  async processConversationEvent(eventData) {
    const processors = [
      this.updateAnalytics,
      this.checkWorkflowTriggers,
      this.updateCustomerRecord,
      this.sendNotifications
    ];
    
    // Process in parallel where possible
    await Promise.all(
      processors.map(processor => processor(eventData))
    );
  }
}
```

### Real-Time Dashboard Integration

**WebSocket-Based Updates:**
```javascript
// Real-time dashboard server
const io = require('socket.io')(server);

// Handle helpNINJA webhook events
app.post('/webhooks/helpninja', (req, res) => {
  const event = req.body;
  
  // Process event and emit to connected dashboards
  processEventForDashboard(event);
  
  res.status(200).json({received: true});
});

function processEventForDashboard(event) {
  const dashboardData = transformEventForDashboard(event);
  
  // Emit to relevant dashboard rooms
  const rooms = determineRelevantRooms(event);
  
  rooms.forEach(room => {
    io.to(room).emit('helpninja-update', dashboardData);
  });
}

function determineRelevantRooms(event) {
  const rooms = [`tenant-${event.tenant_id}`];
  
  // Add event-specific rooms
  if (event.event === 'conversation.started') {
    rooms.push('live-conversations');
  }
  
  if (event.event === 'lead.qualified') {
    rooms.push('leads-dashboard');
  }
  
  if (event.data.escalation_reason) {
    rooms.push('support-alerts');
  }
  
  return rooms;
}

// Dashboard client connection
io.on('connection', (socket) => {
  socket.on('join-dashboard', (data) => {
    const { tenantId, dashboardType } = data;
    
    // Join tenant-specific room
    socket.join(`tenant-${tenantId}`);
    
    // Join dashboard-specific rooms
    if (dashboardType === 'analytics') {
      socket.join('live-conversations');
    }
    
    if (dashboardType === 'sales') {
      socket.join('leads-dashboard');
    }
    
    if (dashboardType === 'support') {
      socket.join('support-alerts');
    }
  });
});
```

---

## Data Processing & Transformation

### Conversation Data Enrichment

**AI-Powered Data Enhancement:**
```javascript
// Enrich conversation data with additional insights
class ConversationEnricher {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async enrichConversation(conversationId) {
    // Get conversation data from helpNINJA
    const conversation = await this.getConversation(conversationId);
    
    // Extract insights using AI
    const insights = await this.extractInsights(conversation);
    
    // Classify conversation
    const classification = await this.classifyConversation(conversation);
    
    // Extract entities (companies, products, etc.)
    const entities = await this.extractEntities(conversation);
    
    // Calculate conversation metrics
    const metrics = this.calculateMetrics(conversation);
    
    return {
      ...conversation,
      insights,
      classification,
      entities,
      metrics
    };
  }
  
  async extractInsights(conversation) {
    const prompt = `Analyze this customer conversation and extract key insights:
    
    ${conversation.transcript}
    
    Extract:
    1. Customer intent and goals
    2. Pain points mentioned
    3. Product/feature interests
    4. Buying signals
    5. Competitive mentions
    6. Urgency indicators
    
    Return as structured JSON.`;
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
  
  async classifyConversation(conversation) {
    // Use AI to classify conversation type
    const categories = await this.categorizeConversation(conversation);
    const sentiment = await this.analyzeSentiment(conversation);
    const priority = this.calculatePriority(conversation, sentiment);
    
    return {
      categories,
      sentiment,
      priority,
      complexity: this.assessComplexity(conversation)
    };
  }
}
```

### Data Pipeline Integration

**Stream Processing:**
```javascript
// Apache Kafka integration for stream processing
const kafka = require('kafkajs');

class HelpNinjaStreamProcessor {
  constructor() {
    this.kafka = kafka({
      clientId: 'helpninja-processor',
      brokers: [process.env.KAFKA_BROKER]
    });
    
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'helpninja-group' });
  }
  
  async start() {
    await this.producer.connect();
    await this.consumer.connect();
    
    // Subscribe to helpNINJA events topic
    await this.consumer.subscribe({
      topic: 'helpninja-events',
      fromBeginning: false
    });
    
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        await this.processEvent(event);
      }
    });
  }
  
  async processEvent(event) {
    // Transform and enrich event data
    const enrichedEvent = await this.enrichEvent(event);
    
    // Route to appropriate downstream topics
    const topics = this.determineOutputTopics(event);
    
    for (const topic of topics) {
      await this.producer.send({
        topic,
        messages: [{
          key: enrichedEvent.conversation_id,
          value: JSON.stringify(enrichedEvent)
        }]
      });
    }
  }
  
  determineOutputTopics(event) {
    const topics = ['helpninja-enriched'];
    
    if (event.event.startsWith('conversation.')) {
      topics.push('conversation-events');
    }
    
    if (event.event === 'lead.qualified') {
      topics.push('sales-leads');
    }
    
    if (event.event === 'conversation.escalated') {
      topics.push('support-escalations');
    }
    
    return topics;
  }
}
```

---

## Security & Authentication

### API Security Best Practices

**Secure API Access:**
```javascript
// Implement proper authentication and rate limiting
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Security middleware
app.use(helmet());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many API requests from this IP'
});

app.use('/api/', apiLimiter);

// API key validation middleware
function validateApiKey(req, res, next) {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing API key',
      message: 'Include Authorization header with Bearer token'
    });
  }
  
  // Validate API key format
  if (!apiKey.match(/^hnja_(test|live)_[a-zA-Z0-9]{32}$/)) {
    return res.status(401).json({
      error: 'Invalid API key format'
    });
  }
  
  // Verify API key with helpNINJA
  verifyApiKey(apiKey)
    .then(keyData => {
      req.apiKey = keyData;
      req.tenantId = keyData.tenant_id;
      next();
    })
    .catch(error => {
      res.status(401).json({
        error: 'Invalid API key',
        message: 'API key not found or expired'
      });
    });
}

// Tenant isolation middleware
function validateTenantAccess(req, res, next) {
  const requestedTenantId = req.headers['x-tenant-id'] || req.params.tenantId;
  
  if (requestedTenantId && requestedTenantId !== req.tenantId) {
    return res.status(403).json({
      error: 'Tenant access denied',
      message: 'API key does not have access to requested tenant'
    });
  }
  
  next();
}
```

### Data Encryption & Privacy

**End-to-End Security:**
```javascript
// Encrypt sensitive data in transit and at rest
const crypto = require('crypto');

class SecureDataHandler {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    this.algorithm = 'aes-256-gcm';
  }
  
  encryptSensitiveData(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from('helpninja-data', 'utf8'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decryptSensitiveData(encryptedData) {
    const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
    decipher.setAAD(Buffer.from('helpninja-data', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
  
  // PII detection and masking
  maskPII(text) {
    // Email addresses
    text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    
    // Phone numbers  
    text = text.replace(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g, '[PHONE]');
    
    // Credit card numbers
    text = text.replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[CREDIT_CARD]');
    
    // SSN
    text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
    
    return text;
  }
}
```

---

## Testing & Debugging

### Integration Testing

**Automated Testing Suite:**
```javascript
// Jest test suite for helpNINJA integration
const request = require('supertest');
const app = require('../app');

describe('helpNINJA Integration', () => {
  const mockApiKey = 'hnja_test_abcdef1234567890abcdef1234567890';
  const mockTenantId = 'tenant_test123';
  
  beforeEach(() => {
    // Mock helpNINJA API responses
    nock('https://helpninja.app')
      .get(`/v1/conversations/${mockConversationId}`)
      .reply(200, mockConversationData);
  });
  
  test('should process conversation.started webhook', async () => {
    const webhookPayload = {
      event: 'conversation.started',
      tenant_id: mockTenantId,
      data: {
        conversation_id: 'conv_test123',
        site_url: 'https://example.com',
        initial_message: 'Hello, I need help'
      }
    };
    
    const response = await request(app)
      .post('/webhooks/helpninja')
      .send(webhookPayload)
      .expect(200);
    
    expect(response.body.received).toBe(true);
    
    // Verify downstream processing
    expect(mockCRMClient.createLead).not.toHaveBeenCalled();
    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('conversation_started', expect.any(Object));
  });
  
  test('should create lead for qualified conversation', async () => {
    const webhookPayload = {
      event: 'lead.qualified',
      tenant_id: mockTenantId,
      data: {
        conversation_id: 'conv_test123',
        qualification_score: 85,
        customer_email: 'test@example.com'
      }
    };
    
    await request(app)
      .post('/webhooks/helpninja')
      .send(webhookPayload)
      .expect(200);
    
    expect(mockCRMClient.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        source: 'helpNINJA Chat Widget'
      })
    );
  });
  
  test('should handle API errors gracefully', async () => {
    // Mock API failure
    nock('https://helpninja.app')
      .get('/v1/conversations/conv_test123')
      .reply(500, { error: 'Internal server error' });
    
    const webhookPayload = {
      event: 'conversation.ended',
      tenant_id: mockTenantId,
      data: { conversation_id: 'conv_test123' }
    };
    
    await request(app)
      .post('/webhooks/helpninja')
      .send(webhookPayload)
      .expect(200);
    
    // Should log error but not fail webhook
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch conversation details')
    );
  });
});
```

### Debug Tools & Monitoring

**Comprehensive Logging:**
```javascript
// Structured logging for integration debugging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'helpninja-integration' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Integration-specific logging
class IntegrationLogger {
  static logWebhookReceived(event) {
    logger.info('Webhook received', {
      event_type: event.event,
      tenant_id: event.tenant_id,
      conversation_id: event.data.conversation_id,
      timestamp: event.timestamp
    });
  }
  
  static logProcessingStart(eventType, conversationId) {
    logger.info('Processing started', {
      event_type: eventType,
      conversation_id: conversationId,
      processing_start: new Date().toISOString()
    });
  }
  
  static logProcessingComplete(eventType, conversationId, duration) {
    logger.info('Processing completed', {
      event_type: eventType,
      conversation_id: conversationId,
      duration_ms: duration,
      processing_end: new Date().toISOString()
    });
  }
  
  static logError(error, context = {}) {
    logger.error('Integration error', {
      error_message: error.message,
      error_stack: error.stack,
      ...context
    });
  }
  
  static logAPICall(method, url, statusCode, duration) {
    logger.info('API call', {
      method,
      url: url.replace(/\/[a-f0-9-]{36}\//g, '/[ID]/'), // Mask IDs
      status_code: statusCode,
      duration_ms: duration
    });
  }
}

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    integrations: {
      helpninja_api: 'connected',
      database: 'connected',
      webhook_processor: 'running'
    },
    metrics: {
      webhooks_processed_24h: getWebhookCount24h(),
      average_processing_time: getAverageProcessingTime(),
      error_rate_24h: getErrorRate24h()
    }
  };
  
  res.status(200).json(health);
});
```

---

## Deployment & Production

### Container Deployment

**Docker Configuration:**
```dockerfile
# Dockerfile for helpNINJA integration service
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S helpninja -u 1001

# Set permissions
RUN chown -R helpninja:nodejs /app
USER helpninja

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "server.js"]
```

**Docker Compose for Development:**
```yaml
version: '3.8'
services:
  helpninja-integration:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - HELPNINJA_API_KEY=${HELPNINJA_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
    depends_on:
      - redis
      - postgres
    volumes:
      - ./logs:/app/logs
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=helpninja_integration
      - POSTGRES_USER=helpninja
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  redis_data:
  postgres_data:
```

### Production Monitoring

**Monitoring & Alerting:**
```javascript
// Prometheus metrics for monitoring
const client = require('prom-client');

// Create metrics
const webhookCounter = new client.Counter({
  name: 'helpninja_webhooks_total',
  help: 'Total number of webhooks received',
  labelNames: ['event_type', 'tenant_id', 'status']
});

const processingDuration = new client.Histogram({
  name: 'helpninja_processing_duration_seconds',
  help: 'Time spent processing webhooks',
  labelNames: ['event_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const apiCallDuration = new client.Histogram({
  name: 'helpninja_api_call_duration_seconds',
  help: 'Duration of API calls to helpNINJA',
  labelNames: ['method', 'endpoint', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5]
});

// Middleware to collect metrics
function collectMetrics(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    if (req.path === '/webhooks/helpninja') {
      const event = req.body;
      webhookCounter.inc({
        event_type: event.event,
        tenant_id: event.tenant_id,
        status: res.statusCode < 400 ? 'success' : 'error'
      });
      
      processingDuration.observe(
        { event_type: event.event },
        duration
      );
    }
  });
  
  next();
}

app.use(collectMetrics);

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(client.register.metrics());
});
```

---

## Integration Examples & Templates

### Popular Integration Templates

**Slack Notification Integration:**
```javascript
// Send helpNINJA events to Slack channels
class SlackIntegration {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }
  
  async handleEscalation(eventData) {
    const message = {
      text: "🚨 Chat Escalation Alert",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Chat Escalation Required"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Site:* ${eventData.site_url}`
            },
            {
              type: "mrkdwn",
              text: `*Confidence:* ${(eventData.confidence_score * 100).toFixed(1)}%`
            },
            {
              type: "mrkdwn",
              text: `*Reason:* ${eventData.escalation_reason}`
            },
            {
              type: "mrkdwn",
              text: `*Priority:* ${eventData.priority}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Customer Question:*\n${eventData.customer_message}`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View Conversation"
              },
              url: `https://helpninja.app/conversations/${eventData.conversation_id}`,
              style: "primary"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Take Over Chat"
              },
              url: `https://helpninja.app/conversations/${eventData.conversation_id}/respond`
            }
          ]
        }
      ]
    };
    
    await this.sendToSlack(message);
  }
  
  async sendToSlack(message) {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }
  }
}
```

**Google Sheets Data Export:**
```javascript
// Export conversation data to Google Sheets
const { GoogleSpreadsheet } = require('google-spreadsheet');

class GoogleSheetsExport {
  constructor(sheetId, serviceAccountCreds) {
    this.doc = new GoogleSpreadsheet(sheetId);
    this.creds = serviceAccountCreds;
  }
  
  async initialize() {
    await this.doc.useServiceAccountAuth(this.creds);
    await this.doc.loadInfo();
    
    // Get or create the conversations sheet
    this.sheet = this.doc.sheetsByTitle['Conversations'] || 
                 await this.doc.addSheet({ title: 'Conversations' });
    
    // Set up headers if empty
    if (this.sheet.rowCount === 0) {
      await this.sheet.setHeaderRow([
        'Date', 'Conversation ID', 'Site URL', 'Customer Message',
        'AI Response', 'Confidence Score', 'Escalated', 'Resolution Status',
        'Satisfaction Score', 'Duration (min)', 'Topic Categories'
      ]);
    }
  }
  
  async exportConversation(conversationData) {
    await this.sheet.addRow({
      'Date': new Date(conversationData.timestamp).toLocaleDateString(),
      'Conversation ID': conversationData.conversation_id,
      'Site URL': conversationData.site_url,
      'Customer Message': conversationData.first_message,
      'AI Response': conversationData.ai_response,
      'Confidence Score': conversationData.confidence_score,
      'Escalated': conversationData.escalated ? 'Yes' : 'No',
      'Resolution Status': conversationData.resolution_status,
      'Satisfaction Score': conversationData.satisfaction_score || 'N/A',
      'Duration (min)': conversationData.duration_minutes,
      'Topic Categories': conversationData.topics.join(', ')
    });
  }
}
```

### Enterprise Integration Pattern

**Microservices Architecture:**
```javascript
// Service registry for microservices integration
class IntegrationRegistry {
  constructor() {
    this.services = new Map();
    this.eventBus = new EventEmitter();
    this.healthChecks = new Map();
  }
  
  registerService(name, service) {
    this.services.set(name, service);
    this.setupHealthCheck(name, service);
    
    // Subscribe service to relevant events
    if (service.eventHandlers) {
      Object.keys(service.eventHandlers).forEach(eventType => {
        this.eventBus.on(eventType, service.eventHandlers[eventType]);
      });
    }
  }
  
  async processWebhookEvent(event) {
    // Emit event to all registered services
    this.eventBus.emit(event.event, event.data);
    this.eventBus.emit('*', event); // Catch-all for monitoring services
    
    // Track processing metrics
    this.trackEventProcessing(event);
  }
  
  setupHealthCheck(serviceName, service) {
    if (service.healthCheck) {
      this.healthChecks.set(serviceName, service.healthCheck);
    }
  }
  
  async getSystemHealth() {
    const health = {
      status: 'healthy',
      services: {}
    };
    
    for (const [name, healthCheck] of this.healthChecks) {
      try {
        health.services[name] = await healthCheck();
      } catch (error) {
        health.services[name] = {
          status: 'unhealthy',
          error: error.message
        };
        health.status = 'degraded';
      }
    }
    
    return health;
  }
}

// Example service implementation
class SalesforceIntegrationService {
  constructor(salesforceClient) {
    this.salesforce = salesforceClient;
    this.eventHandlers = {
      'lead.qualified': this.handleQualifiedLead.bind(this),
      'conversation.escalated': this.handleEscalation.bind(this)
    };
  }
  
  async handleQualifiedLead(eventData) {
    const lead = await this.createSalesforceLead(eventData);
    await this.assignToSalesRep(lead);
    await this.triggerFollowUpSequence(lead);
  }
  
  async handleEscalation(eventData) {
    await this.createSalesforceCase(eventData);
    await this.notifySuportTeam(eventData);
  }
  
  async healthCheck() {
    try {
      await this.salesforce.query('SELECT Id FROM User LIMIT 1');
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        last_successful_connection: this.lastSuccessfulConnection
      };
    }
  }
}
```

---

## Support & Resources

### API Documentation

**Interactive API Explorer:**
- **Postman Collection**: Import complete helpNINJA API collection
- **OpenAPI Specification**: Swagger documentation with live testing
- **Code Examples**: Sample code in multiple programming languages
- **Webhook Simulator**: Test webhook integrations without live events
- **API Console**: Interactive API testing environment

### Development Tools

**SDK & Libraries:**
```
Official SDKs:
├── JavaScript/Node.js: @helpninja/sdk-js
├── Python: helpninja-python
├── PHP: helpninja/php-sdk
├── Ruby: helpninja-ruby
├── Go: github.com/helpninja/go-sdk
├── .NET: HelpNinja.SDK
└── Java: com.helpninja:sdk-java

Community Libraries:
├── Laravel Package: laravel-helpninja
├── WordPress Plugin: helpninja-wp
├── Shopify App: helpninja-shopify
└── Zapier Integration: Native Zapier support
```

### Support Channels

**Developer Support:**
- **Developer Forum**: Community Q&A and best practices
- **GitHub Issues**: Bug reports and feature requests for SDKs
- **Discord Community**: Real-time developer chat and support
- **Office Hours**: Weekly developer Q&A sessions with helpNINJA engineers
- **Professional Services**: Custom integration development and consultation

**Documentation & Tutorials:**
- **Integration Guides**: Step-by-step tutorials for common integrations
- **Video Workshops**: Recorded sessions on advanced integration techniques
- **Best Practices**: Performance optimization and security guidelines
- **Case Studies**: Real-world integration examples and success stories

---

## Next Steps

Ready to build powerful custom integrations?

1. **[API Documentation](api-documentation.md)**: Complete technical API reference
2. **[Advanced Analytics](advanced-analytics.md)**: Track and optimize integration performance
3. **[Security Best Practices](security-best-practices.md)**: Secure your integrations properly
4. **[Enterprise Architecture](enterprise-architecture.md)**: Design scalable integration solutions

---

*Custom integrations unlock the full potential of helpNINJA by connecting it seamlessly with your existing systems and workflows. Start with simple webhook integrations and evolve to sophisticated, event-driven architectures that transform how you handle customer conversations.*
