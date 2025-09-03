# Widget Chat History Persistence

## Overview

Currently, the helpNINJA chat widget loses conversation history when users navigate to new pages. This document outlines the implementation plan for persistent chat history that maintains continuity across page navigations, improving user experience and reducing support friction.

## Current State Analysis

### What's Already Working ✅
1. **Session ID persistence** - Widget generates and stores session ID in localStorage
2. **Server-side conversation tracking** - Backend links messages to conversations via session ID
3. **Conversation continuity** - Server maintains full chat history for each session

### What's Missing ❌
1. **Chat UI history restoration** - Widget doesn't restore visible conversation when page loads
2. **Message state persistence** - No local storage of conversation for offline viewing
3. **Graceful history recovery** - No fallback if localStorage fails

## User Experience Problems

### Current Behavior
- User starts conversation on Page A
- User navigates to Page B  
- Widget appears "fresh" with welcome message
- User must restart conversation from beginning
- Previous context is lost from UI perspective

### Expected Behavior
- User starts conversation on Page A
- User navigates to Page B
- Widget shows previous conversation history
- User can continue from where they left off
- Seamless experience across site navigation

## Implementation Strategy

### Phase 1: Local Storage Persistence (Immediate)

**Approach:** Store conversation history in localStorage and restore on widget initialization.

#### 1.1 Storage Structure
```javascript
// localStorage key pattern: `hn_chat_${sessionId}`
{
  "sessionId": "sid_abc123",
  "messages": [
    {
      "role": "assistant",
      "content": "Hi there! How can I help?",
      "timestamp": "2024-09-02T10:30:00Z"
    },
    {
      "role": "user", 
      "content": "What are your store hours?",
      "timestamp": "2024-09-02T10:30:15Z"
    }
  ],
  "lastUpdated": "2024-09-02T10:30:15Z"
}
```

#### 1.2 Implementation Points

**A. Chat History Storage Functions**
```javascript
// Save chat history after each message
function saveChatHistory() {
  try {
    const messages = extractMessagesFromDOM();
    const historyData = {
      sessionId: sessionId,
      messages: messages,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(`hn_chat_${sessionId}`, JSON.stringify(historyData));
  } catch (e) {
    console.warn('Failed to save chat history:', e);
  }
}

// Extract messages from DOM
function extractMessagesFromDOM() {
  return Array.from(msgs.children).map(row => {
    const isUser = row.style.justifyContent === 'flex-end';
    const bubble = row.querySelector('div:last-child');
    return {
      role: isUser ? 'user' : 'assistant',
      content: isUser ? bubble.textContent : bubble.innerHTML,
      timestamp: new Date().toISOString()
    };
  });
}

// Restore chat history on widget load
function restoreChatHistory() {
  try {
    const savedHistory = localStorage.getItem(`hn_chat_${sessionId}`);
    if (savedHistory) {
      const historyData = JSON.parse(savedHistory);
      
      // Validate session matches
      if (historyData.sessionId === sessionId) {
        historyData.messages.forEach(msg => {
          add(msg.role, msg.content, false); // false = don't save to avoid recursion
        });
        return true; // History restored successfully
      }
    }
    return false; // No history found
  } catch (e) {
    console.warn('Failed to restore chat history:', e);
    return false;
  }
}
```

**B. Integration with Existing Code**
- Modify `add()` function to call `saveChatHistory()` after adding messages
- Call `restoreChatHistory()` in widget initialization
- Update welcome message logic to only show if no history exists

**C. Storage Management**
- Implement cleanup for old sessions (>30 days)
- Handle localStorage quota exceeded errors
- Provide fallback when localStorage unavailable

### Phase 2: Server-Side History Recovery (Enhanced)

**Approach:** Fetch conversation history from server when localStorage fails or is unavailable.

#### 2.1 New API Endpoint

**Endpoint:** `GET /api/chat/history`

**Parameters:**
- `sessionId` - Session identifier
- `tenantId` - Tenant identifier  
- `limit` - Maximum messages to return (default: 50)

**Response:**
```json
{
  "success": true,
  "sessionId": "sid_abc123",
  "messages": [
    {
      "id": "msg_001",
      "role": "assistant",
      "content": "Hi there! How can I help?",
      "createdAt": "2024-09-02T10:30:00Z"
    },
    {
      "id": "msg_002", 
      "role": "user",
      "content": "What are your store hours?",
      "createdAt": "2024-09-02T10:30:15Z"
    }
  ],
  "totalCount": 8,
  "hasMore": false
}
```

#### 2.2 Implementation

**A. Backend Implementation**
```sql
-- Query for conversation history
SELECT 
  id,
  role,
  content,
  created_at
FROM messages 
WHERE conversation_id = (
  SELECT id FROM conversations 
  WHERE session_id = $1 AND tenant_id = $2
)
ORDER BY created_at ASC
LIMIT $3;
```

**B. Widget Integration**
```javascript
// Enhanced history loading with server fallback
async function loadConversationHistory() {
  // Try localStorage first
  if (restoreChatHistory()) {
    return true;
  }
  
  // Fallback to server
  try {
    const response = await fetch(
      `${baseOrigin}/api/chat/history?sessionId=${sessionId}&tenantId=${tenantId}&limit=50`
    );
    
    if (response.ok) {
      const data = await response.json();
      data.messages.forEach(msg => {
        add(msg.role, msg.content, false);
      });
      
      // Save to localStorage for future use
      saveChatHistory();
      return true;
    }
  } catch (e) {
    console.warn('Failed to load server history:', e);
  }
  
  return false; // No history available
}
```

### Phase 3: Advanced Features (Future)

#### 3.1 Conversation Resumption Indicators
- Show timestamp of last message
- Indicate conversation continuation vs. new conversation
- "Continue conversation" vs "Start new conversation" options

#### 3.2 History Management
- User option to clear conversation history
- Export conversation history
- Search within conversation history

#### 3.3 Cross-Device Synchronization
- Sync conversations across devices for logged-in users
- Cloud storage for conversation backup

## Technical Implementation Details

### File Changes Required

#### 1. Widget Client (`public/widget/v1/client.js`)
- Add history storage functions
- Modify `add()` function to save history
- Update initialization to restore history
- Add cleanup and error handling

#### 2. New API Route (`src/app/api/chat/history/route.ts`)
```typescript
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const tenantId = searchParams.get('tenantId');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  // Validation and query implementation
  // Return conversation history
}
```

#### 3. Database Considerations
- Ensure indexes exist on `conversations.session_id` and `messages.conversation_id`
- Consider message retention policies
- Add cleanup jobs for old conversations

### Error Handling Strategy

#### localStorage Failures
- Private browsing mode detection
- Quota exceeded handling
- Graceful degradation to server-only mode

#### Network Failures
- Retry logic for server requests
- Offline mode support
- Cache invalidation strategies

#### Data Inconsistency
- Version checking between local and server data
- Conflict resolution strategies
- Data validation and sanitization

## Testing Plan

### Unit Tests
- localStorage save/restore functions
- Message extraction from DOM
- Error handling scenarios
- History cleanup functionality

### Integration Tests
- Full widget lifecycle with history
- Server API endpoint testing
- Cross-browser compatibility
- Performance impact measurement

### User Experience Tests
- Navigation flow testing
- History restoration accuracy
- Performance benchmarking
- Mobile device testing

## Performance Considerations

### Storage Efficiency
- Limit stored message count (last 50 messages)
- Compress stored data if needed
- Implement circular buffer for messages

### Loading Performance
- Async history restoration
- Progressive message loading
- Lazy loading for old messages

### Memory Management
- DOM cleanup for old messages
- Event listener management
- Storage cleanup schedules

## Security Considerations

### Data Privacy
- No sensitive information in localStorage
- Message content sanitization
- Session ID protection

### Storage Security
- Validate stored data before use
- Prevent XSS through stored content
- Secure session management

## Rollout Plan

### Phase 1: Core Implementation (Week 1)
1. Implement localStorage persistence
2. Add history restoration to widget
3. Basic error handling
4. Internal testing

### Phase 2: Server Integration (Week 2)
1. Create history API endpoint
2. Implement server fallback
3. Enhanced error handling
4. Beta user testing

### Phase 3: Optimization (Week 3)
1. Performance improvements
2. Advanced features
3. Cross-browser testing
4. Production deployment

### Phase 4: Monitoring (Week 4)
1. Usage analytics
2. Error monitoring
3. Performance metrics
4. User feedback collection

## Success Metrics

### Technical Metrics
- History restoration success rate >95%
- Widget load time increase <200ms
- localStorage usage <1MB per session
- Error rate <2%

### User Experience Metrics
- Reduced conversation restarts by 60%
- Increased session continuation rate
- Improved user satisfaction scores
- Decreased support tickets about "lost conversations"

## Framework-Specific Considerations

### React/Next.js Applications
- Place widget in persistent layout component
- Handle React Router navigation events
- Prevent component unmounting during navigation

### Single Page Applications (SPAs)
- Hook into router navigation events
- Maintain widget state during route changes
- Handle dynamic content updates

### Traditional Multi-Page Sites
- Ensure consistent widget placement
- Handle full page refreshes
- Optimize loading performance

## Migration Strategy

### Existing Users
- Gradual rollout with feature flags
- A/B testing for performance impact
- Fallback to current behavior if issues

### New Installations
- Default to enhanced history behavior
- Documentation updates
- Example implementations

## Documentation Updates Required

### User-Facing Documentation
- Update widget integration guides
- Add troubleshooting section for history issues
- Create best practices guide

### Developer Documentation
- API reference for history endpoint
- Widget configuration options
- Performance optimization guide

## Risk Assessment

### High Risk
- **localStorage unavailability** - Mitigation: Server fallback
- **Performance degradation** - Mitigation: Careful optimization and testing
- **Data corruption** - Mitigation: Validation and error handling

### Medium Risk  
- **Browser compatibility** - Mitigation: Comprehensive testing
- **Storage quota issues** - Mitigation: Cleanup and size limits
- **Network failures** - Mitigation: Graceful degradation

### Low Risk
- **User privacy concerns** - Mitigation: Clear data handling policies
- **Increased complexity** - Mitigation: Good documentation and testing

## Conclusion

Implementing chat history persistence will significantly improve the user experience of the helpNINJA widget by maintaining conversation continuity across page navigations. The phased approach ensures a stable rollout with proper fallbacks and error handling.

The implementation leverages existing infrastructure (session management, database schema) while adding minimal complexity. The expected benefits include reduced user frustration, improved engagement, and decreased support load.

This enhancement positions helpNINJA as a more competitive solution in the chat widget market, addressing a common pain point that many competitors don't handle well.
