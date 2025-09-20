# helpNINJA Implementation Plan
**Multi-Site Features & Complete User Experience**

## Overview
This document tracks the implementation of missing critical features identified during the live preview analysis. The current codebase is a solid MVP foundation, but lacks the complete user experience expected for a multi-site AI support system.

---

## 🎯 Priority Levels
- **P0 Critical**: Blocks core user flows
- **P1 High**: Essential for production readiness  
- **P2 Medium**: Important for user experience
- **P3 Low**: Nice-to-have enhancements

---

## 📋 Implementation Phases

### **Phase 1: Site Management Foundation (P0 Critical)** ✅ COMPLETED
*Enable tenants to register and manage multiple websites*

#### ✅ Database Schema (COMPLETED)
- [x] `tenant_sites` table creation
- [x] `site_id` foreign keys on documents, chunks, sources
- [x] Enhanced `answers` table with site support
- [x] `escalation_rules` table
- [x] All necessary indexes and constraints

#### ✅ API Routes (COMPLETED)
- [x] `src/app/api/sites/route.ts` - List/create tenant sites
- [x] `src/app/api/sites/[id]/route.ts` - Update/delete specific site
- [x] `src/app/api/sites/[id]/verify/route.ts` - Domain verification
- [x] Update `src/app/api/widget/route.ts` - Add domain validation
- [x] Update `src/app/api/ingest/route.ts` - Support site-specific ingestion

#### ✅ Core Components (COMPLETED)
- [x] `src/components/site-manager.tsx` - Site CRUD interface
- [x] `src/components/site-selector.tsx` - Site dropdown for forms
- [x] `src/components/domain-verification.tsx` - Domain ownership verification
- [ ] Update `src/components/chat-preview.tsx` - Site-specific previews

### **Phase 2: Onboarding Experience (P0 Critical)** ✅ COMPLETED
*3-step flow: create tenant → register sites → get widget*

#### ✅ Onboarding Components (COMPLETED)
- [x] `src/components/onboarding-progress.tsx` - Step indicator with progress bar
- [x] `src/components/onboarding-navigation.tsx` - Next/Previous navigation
- [x] Integrated `src/components/site-manager.tsx` for site registration
- [x] Integrated `src/components/domain-verification.tsx` for verification
- [x] Integrated `src/components/chat-preview.tsx` for live widget preview

#### ✅ Navigation & UX Integration (COMPLETED)
- [x] Updated `src/components/sidebar.tsx` - Reorganized navigation with Sites section
- [x] Created `src/app/dashboard/sites/page.tsx` - Site management page
- [x] Added smart quick start banner to dashboard for new users
- [x] Integrated onboarding links throughout the application
- [x] Added "Coming Soon" labels for future features

### **Phase 3: Content Management Enhancement (P1 High)** ✅ COMPLETED
*Separate sources from documents, add site-specific management*

#### ✅ Sources Management (COMPLETED)
- [x] `src/app/dashboard/sources/page.tsx` - Sources management page
- [x] `src/app/api/sources/route.ts` - Enhanced sources API  
- [x] `src/app/api/sources/[id]/route.ts` - Individual source management
- [x] `src/app/api/sources/[id]/crawl/route.ts` - Trigger crawling
- [x] `src/components/sources-table.tsx` - Sources list with site filter
- [x] `src/components/crawl-status.tsx` - Crawling progress indicator
- [x] `src/sql/050_sources_sites.sql` - Database schema for site associations

#### ✅ Enhanced Documents (COMPLETED)
- [x] Update `src/app/dashboard/documents/page.tsx` - Add site filtering and source info
- [x] Update `src/components/ingest-form.tsx` - Site selection integration
- [x] `src/app/api/sites/stats/route.ts` - Site statistics endpoint
- [x] Enhanced document queries with site and source relationships

#### ✅ Answer Editor (COMPLETED)
- [x] `src/app/dashboard/answers/page.tsx` - Curated answers management
- [x] `src/app/api/answers/route.ts` - CRUD for curated answers
- [x] `src/app/api/answers/[id]/route.ts` - Individual answer management
- [x] `src/components/answer-editor.tsx` - Rich editor for answers with priority/status
- [x] `src/components/intent-mapper.tsx` - Map answers to keywords/intents
- [x] `src/sql/051_answers_enhancement.sql` - Enhanced answers table schema
- [x] Updated RAG logic in `src/lib/rag.ts` to prioritize curated answers
- [x] Updated chat API to use curated answers before AI generation

### **Phase 4: Rules & Automation (P1 High)** ✅ COMPLETED
*Escalation rules and intelligent routing*

#### ✅ Escalation Rules (COMPLETED)
- [x] `src/app/dashboard/rules/page.tsx` - Rules management interface with testing
- [x] `src/app/api/rules/route.ts` - CRUD for escalation rules
- [x] `src/app/api/rules/[id]/route.ts` - Individual rule management
- [x] `src/app/api/rules/[id]/test/route.ts` - Rule testing endpoint
- [x] `src/components/rule-builder.tsx` - Visual rule builder with live preview
- [x] `src/components/condition-editor.tsx` - Advanced condition editor
- [x] `src/components/action-selector.tsx` - Integration routing and webhooks
- [x] `src/lib/rule-engine.ts` - Complete rule evaluation engine
- [x] `src/sql/052_escalation_rules_enhancement.sql` - Enhanced rules schema

#### ✅ Outbox Monitoring (COMPLETED)
- [x] `src/app/dashboard/outbox/page.tsx` - Delivery monitoring with stats
- [x] `src/app/api/outbox/route.ts` - Outbox management API
- [x] `src/app/api/outbox/retry/route.ts` - Bulk and individual retry
- [x] `src/app/api/outbox/cleanup/route.ts` - Cleanup old deliveries
- [x] `src/components/outbox-table.tsx` - Failed delivery tracking with retry
- [x] Integration with existing escalation flow

### **Phase 5: Team & Access Management (P2 Medium)** ✅ COMPLETED
*Multi-user support and permissions*

#### ✅ Team Management (COMPLETED)
- [x] `src/app/dashboard/team/page.tsx` - Team management interface with stats
- [x] `src/app/api/team/route.ts` - CRUD for team members
- [x] `src/app/api/team/[userId]/route.ts` - Individual member management
- [x] `src/app/api/team/invitations/route.ts` - Invitation system
- [x] `src/components/team-member-card.tsx` - Rich member cards with actions
- [x] `src/components/add-team-member-form.tsx` - Member invitation form
- [x] `src/components/team-invitations.tsx` - Pending invitations management
- [x] `src/components/role-badge.tsx` - Role visualization
- [x] `src/lib/permissions.ts` - Complete role-based permission system
- [x] `src/components/permission-gate.tsx` - Access control components
- [x] `src/components/user-context.tsx` - User state management
- [x] `src/sql/053_team_management.sql` - Enhanced team database schema

#### 🔲 Enhanced Authentication (P2)
- [ ] Update `src/lib/auth.ts` - Real user session management
- [ ] `src/app/api/auth/login/route.ts` - User login
- [ ] `src/app/api/auth/register/route.ts` - User registration
- [ ] `src/components/login-form.tsx` - Login interface
- [ ] `src/middleware.ts` - Route protection

### **Phase 6: Developer Experience (P2 Medium)** ✅ COMPLETED
*API management and testing tools*

#### ✅ API Keys Management (COMPLETED)
- [x] `src/app/dashboard/settings/api/page.tsx` - Comprehensive API keys and webhooks page
- [x] `src/app/api/api-keys/route.ts` - API key CRUD operations
- [x] `src/app/api/api-keys/[id]/route.ts` - Individual key management
- [x] `src/app/api/api-keys/[id]/rotate/route.ts` - Key rotation endpoint
- [x] `src/app/api/webhooks/route.ts` - Webhook configuration and stats
- [x] `src/app/api/webhooks/[id]/test/route.ts` - Webhook testing endpoint
- [x] `src/sql/054_api_management.sql` - Complete API management database schema

#### ✅ Playground (COMPLETED)
- [x] `src/app/dashboard/playground/page.tsx` - Interactive knowledge base testing
- [x] `src/app/api/playground/test/route.ts` - Advanced query testing with analytics
- [x] `src/app/api/playground/analytics/route.ts` - Knowledge base health analytics
- [x] `src/components/query-tester.tsx` - Comprehensive query testing interface
- [x] `src/components/search-results-viewer.tsx` - Rich results visualization
- [x] `src/components/confidence-display.tsx` - Advanced confidence scoring
- [x] Integration with curated answers and RAG systems

### **Phase 7: Navigation & UX (P1 High)**
*Update navigation and user flows*

#### 🔲 Navigation Updates (P1)
- [ ] Update `src/components/sidebar.tsx` - Add all new pages
- [ ] `src/components/breadcrumb-nav.tsx` - Enhanced breadcrumbs
- [ ] `src/components/quick-actions.tsx` - Dashboard quick actions
- [ ] Update dashboard layout for better UX

#### 🔲 Help & Documentation (P3)
- [ ] `src/app/dashboard/help/page.tsx` - In-app help system
- [ ] `src/components/help-search.tsx` - Searchable help content
- [ ] `src/components/video-tutorials.tsx` - Embedded tutorial videos

### **Phase 8: Legal & Compliance (P3 Low)**
*Legal pages and data management*

#### 🔲 Legal Pages (P3)
- [ ] `src/app/legal/privacy/page.tsx` - Privacy policy
- [ ] `src/app/legal/terms/page.tsx` - Terms of service
- [ ] `src/app/legal/dpa/page.tsx` - Data processing agreement
- [ ] `src/components/legal-layout.tsx` - Legal pages layout

---

## 🔄 Implementation Guidelines

### **Code Standards**
- Follow existing patterns in codebase
- Use TypeScript for all new code
- Implement proper error handling
- Add loading states for async operations
- Include proper accessibility attributes

### **Database Patterns**
- Always include `tenant_id` for multi-tenancy
- Use `site_id` for site-specific features
- Implement proper foreign key constraints
- Add indexes for query performance

### **API Patterns**
- Export `runtime = 'nodejs'` for DB/AI routes
- Export `runtime = 'edge'` for simple routes
- Validate required fields and return proper errors
- Use parameterized queries to prevent SQL injection
- Check `canSendMessage` before OpenAI calls

### **Component Patterns**
- Use DaisyUI components for consistency
- Implement proper loading and error states
- Follow existing animation patterns
- Use FontAwesome icons with `fa-duotone fa-solid`
- Make components responsive

---

## 📊 Success Metrics

### **Phase 1-2 Success Criteria**
- [ ] Tenants can register multiple sites (jobsight.co, kanninja.ai)
- [ ] Widget only loads on registered domains
- [ ] Onboarding flow completes successfully
- [ ] Site-specific previews work correctly

### **Phase 3-4 Success Criteria**
- [ ] Site-specific content management works
- [ ] Curated answers rank above RAG results
- [ ] Escalation rules trigger correctly
- [ ] Failed deliveries are monitored and retryable

### **Phase 5-6 Success Criteria**
- [ ] Multi-user teams work properly
- [ ] API key management is secure
- [ ] Playground provides useful testing
- [ ] All features are properly documented

---

## 🚀 Getting Started

### **Next Steps**
1. **Start with Phase 1**: Site management foundation
2. **Create API routes first**: Backend functionality
3. **Build components**: UI for each feature
4. **Test integration**: Ensure features work together
5. **Update navigation**: Make features discoverable

### **Development Workflow**
1. Create API route and test with curl/Postman
2. Build React component with proper TypeScript
3. Create page that uses the component
4. Update navigation to include new page
5. Test end-to-end user flow
6. Update this plan with completed items

---

**Last Updated**: Today
**Status**: Ready to begin Phase 1 implementation
