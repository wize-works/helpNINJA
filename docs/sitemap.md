# HelpNinja Application Sitemap

## 🏠 **Public Pages**

### Landing & Marketing
- **`/`** - Landing page with product overview and CTAs
- **`/pricing`** - Pricing plans and feature comparison
- **`/features`** - Detailed feature showcase
- **`/about`** - Company information and team
- **`/contact`** - Contact form and support information

### Authentication
- **`/auth/signin`** - User sign-in page
- **`/auth/signup`** - User registration page
- **`/auth/reset-password`** - Password reset flow
- **`/auth/verify-email`** - Email verification page

## 🚀 **Onboarding Flow**

### Setup Wizard
- **`/onboarding/step-1`** - Account setup and tenant configuration
- **`/onboarding/step-2`** - Site configuration and domain setup
- **`/onboarding/step-3`** - Content ingestion and initial knowledge base

## 📊 **Dashboard Application**

### Core Dashboard
- **`/dashboard`** - Main dashboard overview with KPIs and quick actions
  - Total conversations and messages
  - Usage statistics and plan limits
  - Low-confidence rate monitoring
  - Active integrations status
  - Recent activity feed

### Content Management

#### Knowledge Base
- **`/dashboard/documents`** - Document management and content overview
  - Search and filter documents
  - View document details and metadata
  - Bulk operations and organization
  - Site association management

- **`/dashboard/sources`** - Content source management
  - Configure crawling sources
  - Manage sitemaps and URLs
  - Schedule automatic updates
  - Source performance analytics

- **`/dashboard/sites`** - Website configuration and domain management
  - Add and verify domains
  - Configure site-specific settings
  - Widget installation instructions
  - Site analytics and performance

#### Customer Interactions
- **`/dashboard/conversations`** - Customer conversation history
  - View conversation threads
  - Search and filter conversations
  - Export conversation data
  - Customer interaction analytics

### AI Configuration

#### Curated Responses
- **`/dashboard/answers`** - Manage curated answers and responses
  - Create high-priority manual answers
  - Edit and organize answer templates
  - Set answer priorities and triggers
  - Track answer usage analytics

#### Automation Rules
- **`/dashboard/rules`** - Escalation and routing rules
  - Configure auto-escalation triggers
  - Set up routing based on content/confidence
  - Manage escalation workflows
  - Rule performance monitoring

### Integrations & Escalation
- **`/dashboard/integrations`** - Third-party integrations marketplace
  - Available integration providers
  - Configure Slack, email, and other channels
  - Manage integration settings
  - Monitor escalation performance
  - Integration health and status

### Analytics & Reporting
- **`/dashboard/analytics`** - Comprehensive analytics dashboard
  - Conversation trends and patterns
  - AI confidence analysis
  - Response time metrics
  - Top content sources
  - Customer satisfaction scores
  - Usage and performance insights

### Account Management

#### Billing & Plans
- **`/dashboard/billing`** - Subscription and billing management
  - Current plan details and usage
  - Upgrade/downgrade options
  - Billing history and invoices
  - Payment method management

#### Settings & Configuration
- **`/dashboard/settings`** - General account settings
  - Profile information
  - Notification preferences
  - Security settings
  - Account preferences

- **`/dashboard/settings/api`** - API keys and developer tools
  - Generate and manage API keys
  - API documentation links
  - Webhook configuration
  - Rate limiting information

#### Team Management
- **`/dashboard/team`** - Team member and permission management
  - Invite team members
  - Manage roles and permissions
  - Team activity monitoring
  - Access control settings

### Development Tools
- **`/dashboard/playground`** - Development and testing tools
  - Test AI responses
  - Query knowledge base
  - Debug conversation flows
  - Performance testing tools

## 🔗 **API Endpoints**

### Widget & Chat
- **`/api/widget`** - Widget script serving (Edge runtime)
- **`/api/chat`** - Main chat processing endpoint
- **`/api/escalate`** - Escalation processing

### Content Management
- **`/api/ingest`** - Content ingestion and processing
- **`/api/documents`** - Document CRUD operations
- **`/api/documents/[id]`** - Individual document management

### Site Management
- **`/api/sites`** - Site configuration endpoints
- **`/api/sites/[id]`** - Individual site management
- **`/api/sites/[id]/verify`** - Domain verification

### Integration Management
- **`/api/integrations`** - Integration configuration
- **`/api/integrations/[id]`** - Individual integration management
- **`/api/integrations/[id]/status`** - Integration health checks
- **`/api/integrations/outbox/process`** - Outbox message processing
- **`/api/integrations/outbox/retry`** - Failed message retry

### Billing & Payments
- **`/api/billing/checkout`** - Stripe checkout session creation
- **`/api/billing/portal`** - Customer portal access
- **`/api/stripe/webhook`** - Stripe webhook handler

### Analytics & Usage
- **`/api/usage`** - Usage statistics and limits
- **`/api/analytics`** - Analytics data endpoints

### Account Management
- **`/api/tenants/[id]/rotate-keys`** - API key rotation
- **`/api/team`** - Team management endpoints
- **`/api/team/[userId]`** - Individual team member management

## 📱 **Widget Integration**

### Embedded Widget
- **Widget Script** - Dynamically served JavaScript widget
  - Floating chat bubble
  - Customizable styling
  - Session management
  - Real-time messaging

### Widget Configuration
- **Installation** - Code snippets and integration guides
- **Customization** - Styling and behavior options
- **Analytics** - Widget performance tracking

## 🔐 **Authentication & Authorization**

### Access Control
- **Role-Based Access** - Different permission levels
- **Team Management** - Multi-user account support
- **API Authentication** - Secure API access with keys

### Security Features
- **Domain Verification** - Secure widget deployment
- **Rate Limiting** - API abuse prevention
- **Audit Logging** - Action tracking and monitoring

## 📊 **Data Flow Architecture**

### Content Processing
1. **Ingestion** → Content crawling and processing
2. **Chunking** → Document segmentation
3. **Embedding** → Vector generation for search
4. **Storage** → PostgreSQL with pgvector

### Chat Processing
1. **Widget** → User message capture
2. **RAG Search** → Hybrid lexical + vector search
3. **AI Processing** → OpenAI chat completion
4. **Response** → Formatted response delivery
5. **Escalation** → Low-confidence message routing

### Integration Flow
1. **Trigger** → Escalation conditions met
2. **Dispatch** → Integration-specific formatting
3. **Delivery** → External service communication
4. **Tracking** → Success/failure monitoring

This sitemap represents the complete application structure, from public marketing pages through the full dashboard functionality, including all API endpoints and integration points.
