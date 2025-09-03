# Advanced Debugging Techniques

Master advanced debugging techniques for helpNINJA to quickly identify, diagnose, and resolve complex issues with precision and efficiency.

## Table of Contents

1. [Advanced Debugging Overview](#advanced-debugging-overview)
2. [Deep System Analysis](#deep-system-analysis)
3. [Network Debugging](#network-debugging)
4. [Database Debugging](#database-debugging)
5. [JavaScript & Browser Debugging](#javascript--browser-debugging)
6. [API Debugging Techniques](#api-debugging-techniques)
7. [Real-Time Debugging](#real-time-debugging)
8. [Performance Profiling](#performance-profiling)
9. [Security Debugging](#security-debugging)
10. [Production Debugging Strategies](#production-debugging-strategies)

## Advanced Debugging Overview

### Debugging Methodology

Structured approach to complex problem resolution:

**Debugging Framework (DIVE Method):**

1. **Define** - Clearly define the problem
2. **Investigate** - Gather comprehensive data
3. **Validate** - Test hypotheses systematically
4. **Execute** - Implement and verify solutions

**Problem Classification:**
- **Critical**: System down, data loss (P0)
- **High**: Major feature broken (P1)
- **Medium**: Minor feature issues (P2)
- **Low**: Cosmetic or enhancement (P3)

**Debugging Tools Arsenal:**
- Browser DevTools (Advanced features)
- Network analysis tools
- Database profilers
- Application monitoring
- Log analysis systems
- Performance profilers

### Advanced Debugging Setup

**Development Environment:**

```javascript
// Advanced debugging configuration
const debugConfig = {
  environment: 'development',
  debugging: {
    verbose: true,
    tracing: true,
    profiling: true,
    memoryLeaks: true,
    networkLogging: true,
    sqlQueries: true
  },
  logging: {
    level: 'debug',
    output: ['console', 'file', 'remote'],
    structured: true,
    correlation: true
  }
};
```

**Production Debugging Setup:**
```javascript
// Safe production debugging
const prodDebugConfig = {
  debugging: {
    safeMode: true,
    sampling: 0.01,    // Debug 1% of requests
    timeLimit: 30000,  // 30 second limit
    memoryLimit: '100MB',
    authorized: ['admin', 'debug']
  }
};
```

## Deep System Analysis

### System State Analysis

Analyze complete system state for complex issues:

**System Snapshot Collection:**

```bash
#!/bin/bash
# Comprehensive system snapshot
echo "=== System Snapshot $(date) ===" > system-snapshot.log

# Process information
ps aux --sort=-%cpu | head -20 >> system-snapshot.log
echo -e "\n=== Memory Usage ===" >> system-snapshot.log
free -h >> system-snapshot.log

# Network connections
echo -e "\n=== Network Connections ===" >> system-snapshot.log
netstat -tuln >> system-snapshot.log

# Disk usage
echo -e "\n=== Disk Usage ===" >> system-snapshot.log
df -h >> system-snapshot.log

# Application-specific data
echo -e "\n=== helpNINJA Processes ===" >> system-snapshot.log
pgrep -f "helpninja" | xargs -I {} ps -p {} -o pid,ppid,%cpu,%mem,cmd
```

**Memory Analysis:**

```javascript
// Advanced memory analysis
const memoryDebugger = {
  takeHeapSnapshot: () => {
    const v8 = require('v8');
    const fs = require('fs');
    
    const snapshot = v8.writeHeapSnapshot();
    console.log(`Heap snapshot written to ${snapshot}`);
    
    // Analyze snapshot programmatically
    const heapStats = v8.getHeapStatistics();
    return {
      snapshot,
      stats: heapStats,
      analysis: analyzeHeapUsage(heapStats)
    };
  },
  
  trackObjectAllocations: () => {
    const allocations = new Map();
    const originalAlloc = Object.create;
    
    Object.create = function(...args) {
      const obj = originalAlloc.apply(this, args);
      const stack = new Error().stack;
      allocations.set(obj, stack);
      return obj;
    };
    
    return allocations;
  }
};
```

### Thread and Process Analysis

**Concurrency Debugging:**

```javascript
// Thread pool analysis
const analyzeThreadPool = () => {
  const cluster = require('cluster');
  const os = require('os');
  
  if (cluster.isMaster) {
    const workers = {};
    
    // Monitor worker performance
    cluster.on('message', (worker, message) => {
      if (message.type === 'performance') {
        workers[worker.id] = {
          ...workers[worker.id],
          ...message.data,
          timestamp: Date.now()
        };
      }
    });
    
    // Analyze worker health
    setInterval(() => {
      Object.entries(workers).forEach(([id, stats]) => {
        if (stats.memoryUsage > 500 * 1024 * 1024) { // 500MB
          console.warn(`Worker ${id} high memory: ${stats.memoryUsage}`);
        }
        if (stats.cpuUsage > 80) {
          console.warn(`Worker ${id} high CPU: ${stats.cpuUsage}%`);
        }
      });
    }, 10000);
  }
};
```

**Deadlock Detection:**

```javascript
// Detect potential deadlocks
const deadlockDetector = {
  locks: new Map(),
  
  acquireLock: (resource, holder) => {
    const existing = this.locks.get(resource);
    if (existing && existing !== holder) {
      console.warn(`Potential deadlock: ${resource} held by ${existing}, requested by ${holder}`);
    }
    this.locks.set(resource, holder);
  },
  
  releaseLock: (resource) => {
    this.locks.delete(resource);
  },
  
  detectCircularDependencies: () => {
    // Implement cycle detection algorithm
    const dependencies = new Map();
    // ... complex cycle detection logic
  }
};
```

## Network Debugging

### Advanced Network Analysis

**Traffic Analysis:**

```bash
# Advanced network debugging
# Monitor specific traffic
tcpdump -i any -w helpninja-traffic.pcap 'host api.helpninja.ai'

# Analyze SSL/TLS handshakes
openssl s_client -connect api.helpninja.ai:443 -debug -state

# Test connection quality
mtr api.helpninja.ai --report --report-cycles 100

# Analyze DNS resolution
dig api.helpninja.ai +trace +additional
```

**WebSocket Connection Debugging:**

```javascript
// Advanced WebSocket debugging
const debugWebSocket = (url) => {
  const ws = new WebSocket(url);
  
  // Connection timing
  const timings = {};
  timings.start = Date.now();
  
  ws.onopen = () => {
    timings.connected = Date.now();
    console.log(`WebSocket connected in ${timings.connected - timings.start}ms`);
    
    // Test connection quality
    setInterval(() => {
      const pingStart = Date.now();
      ws.send(JSON.stringify({ type: 'ping', timestamp: pingStart }));
    }, 30000);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        const latency = Date.now() - data.timestamp;
        console.log(`WebSocket latency: ${latency}ms`);
      }
    } catch (e) {
      console.error('WebSocket message parse error:', e);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', {
      error,
      readyState: ws.readyState,
      url: ws.url,
      timings
    });
  };
  
  // Monitor connection health
  const healthCheck = setInterval(() => {
    if (ws.readyState === WebSocket.CLOSED) {
      console.warn('WebSocket connection lost');
      clearInterval(healthCheck);
    }
  }, 5000);
  
  return ws;
};
```

### HTTP Request/Response Debugging

**Advanced Request Analysis:**

```javascript
// HTTP debugging middleware
const advancedHttpDebugger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  // Log detailed request information
  console.log(`[${requestId}] Request start:`, {
    method: req.method,
    url: req.url,
    headers: req.headers,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    console.log(`[${requestId}] Response:`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: Buffer.byteLength(body),
      headers: res.getHeaders()
    });
    
    originalSend.call(this, body);
  };
  
  // Handle errors
  res.on('error', (error) => {
    console.error(`[${requestId}] Response error:`, error);
  });
  
  next();
};
```

## Database Debugging

### Query Analysis and Optimization

**Advanced Query Debugging:**

```sql
-- Enable query logging with execution plans
SET log_statement = 'all';
SET log_min_duration_statement = 100; -- Log queries > 100ms

-- Detailed query analysis
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
SELECT c.id, c.title, COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.tenant_id = $1
GROUP BY c.id, c.title
ORDER BY c.updated_at DESC
LIMIT 20;

-- Lock analysis
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity 
  ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Connection Pool Debugging:**

```javascript
// Advanced connection pool debugging
const { Pool } = require('pg');

const debugPool = new Pool({
  host: 'localhost',
  database: 'helpninja',
  max: 20,
  // Enhanced debugging options
  log: (msg) => console.log('Pool:', msg),
  beforeConnect: (cfg) => {
    console.log('Attempting connection with config:', cfg);
  },
  afterConnect: (client) => {
    console.log('Connected to database');
    
    // Monitor client for issues
    client.on('error', (err) => {
      console.error('Database client error:', err);
    });
    
    client.on('notice', (msg) => {
      console.log('Database notice:', msg);
    });
  }
});

// Pool monitoring
setInterval(() => {
  console.log('Pool status:', {
    totalCount: debugPool.totalCount,
    idleCount: debugPool.idleCount,
    waitingCount: debugPool.waitingCount
  });
}, 30000);

// Query debugging wrapper
const debugQuery = async (text, params = []) => {
  const start = Date.now();
  const client = await debugPool.connect();
  
  try {
    console.log('Executing query:', { text, params });
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    console.log('Query completed:', {
      duration: `${duration}ms`,
      rows: result.rows.length,
      command: result.command
    });
    
    return result;
  } catch (error) {
    console.error('Query error:', {
      error: error.message,
      query: text,
      params,
      duration: Date.now() - start
    });
    throw error;
  } finally {
    client.release();
  }
};
```

### Transaction Debugging

**Transaction State Analysis:**

```javascript
// Advanced transaction debugging
const transactionDebugger = {
  activeTransactions: new Map(),
  
  beginTransaction: (id, context) => {
    const transaction = {
      id,
      startTime: Date.now(),
      context,
      queries: [],
      state: 'active'
    };
    
    this.activeTransactions.set(id, transaction);
    console.log(`Transaction ${id} started:`, context);
    
    return transaction;
  },
  
  logQuery: (transactionId, query, duration) => {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction) {
      transaction.queries.push({
        query,
        duration,
        timestamp: Date.now()
      });
    }
  },
  
  commitTransaction: (id) => {
    const transaction = this.activeTransactions.get(id);
    if (transaction) {
      transaction.state = 'committed';
      transaction.endTime = Date.now();
      transaction.totalDuration = transaction.endTime - transaction.startTime;
      
      console.log(`Transaction ${id} committed:`, {
        duration: `${transaction.totalDuration}ms`,
        queries: transaction.queries.length
      });
      
      // Check for long-running transactions
      if (transaction.totalDuration > 5000) {
        console.warn(`Long transaction detected: ${id} (${transaction.totalDuration}ms)`);
      }
      
      this.activeTransactions.delete(id);
    }
  },
  
  rollbackTransaction: (id, error) => {
    const transaction = this.activeTransactions.get(id);
    if (transaction) {
      transaction.state = 'rolled_back';
      transaction.error = error;
      
      console.error(`Transaction ${id} rolled back:`, error);
      this.activeTransactions.delete(id);
    }
  },
  
  checkStaleTransactions: () => {
    const now = Date.now();
    this.activeTransactions.forEach((transaction, id) => {
      const age = now - transaction.startTime;
      if (age > 30000) { // 30 seconds
        console.warn(`Stale transaction detected: ${id} (${age}ms old)`);
      }
    });
  }
};
```

## JavaScript & Browser Debugging

### Advanced Browser Debugging

**Console API Advanced Usage:**

```javascript
// Advanced console debugging techniques
const advancedConsoleDebug = {
  // Grouping and styling
  groupedLog: (title, data) => {
    console.group(`%c${title}`, 'color: blue; font-weight: bold');
    Object.entries(data).forEach(([key, value]) => {
      console.log(`${key}:`, value);
    });
    console.groupEnd();
  },
  
  // Performance timing
  timeOperation: (name, operation) => {
    console.time(name);
    const result = operation();
    console.timeEnd(name);
    return result;
  },
  
  // Memory usage tracking
  trackMemory: (label) => {
    if (performance.memory) {
      console.log(`Memory ${label}:`, {
        used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + 'MB',
        total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + 'MB',
        limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + 'MB'
      });
    }
  },
  
  // Stack trace analysis
  getCallStack: () => {
    const stack = new Error().stack;
    return stack.split('\n').slice(2); // Remove Error and current function
  },
  
  // Object deep inspection
  deepInspect: (obj, maxDepth = 3) => {
    const seen = new WeakSet();
    
    const inspect = (obj, depth = 0) => {
      if (depth > maxDepth) return '[Max Depth Reached]';
      if (seen.has(obj)) return '[Circular Reference]';
      if (obj === null || typeof obj !== 'object') return obj;
      
      seen.add(obj);
      
      if (Array.isArray(obj)) {
        return obj.map(item => inspect(item, depth + 1));
      }
      
      const result = {};
      Object.keys(obj).forEach(key => {
        result[key] = inspect(obj[key], depth + 1);
      });
      
      return result;
    };
    
    return inspect(obj);
  }
};
```

**Event Debugging:**

```javascript
// Advanced event debugging
const eventDebugger = {
  listeners: new Map(),
  
  addListener: (element, event, handler, options = {}) => {
    const debugHandler = (e) => {
      console.log(`Event triggered: ${event}`, {
        target: e.target,
        currentTarget: e.currentTarget,
        timeStamp: e.timeStamp,
        type: e.type,
        bubbles: e.bubbles,
        cancelable: e.cancelable,
        defaultPrevented: e.defaultPrevented
      });
      
      // Call original handler
      try {
        return handler(e);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
        throw error;
      }
    };
    
    element.addEventListener(event, debugHandler, options);
    
    // Track for cleanup
    if (!this.listeners.has(element)) {
      this.listeners.set(element, []);
    }
    this.listeners.get(element).push({ event, handler: debugHandler });
  },
  
  removeAllListeners: (element) => {
    const listeners = this.listeners.get(element) || [];
    listeners.forEach(({ event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners.delete(element);
  },
  
  // Monitor all events on element
  monitorAllEvents: (element) => {
    const events = [
      'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
      'keydown', 'keyup', 'keypress', 'focus', 'blur',
      'load', 'error', 'resize', 'scroll'
    ];
    
    events.forEach(event => {
      element.addEventListener(event, (e) => {
        console.log(`[Monitor] ${event}:`, e);
      }, { passive: true });
    });
  }
};
```

### DOM Debugging

**Advanced DOM Analysis:**

```javascript
// DOM debugging utilities
const domDebugger = {
  // Find elements with performance issues
  findProblematicElements: () => {
    const problematic = [];
    
    // Find elements with many children
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length > 100) {
        problematic.push({
          element: el,
          issue: 'too_many_children',
          count: el.children.length
        });
      }
      
      // Find deeply nested elements
      let depth = 0;
      let current = el;
      while (current.parentElement) {
        depth++;
        current = current.parentElement;
      }
      
      if (depth > 20) {
        problematic.push({
          element: el,
          issue: 'deeply_nested',
          depth
        });
      }
    });
    
    return problematic;
  },
  
  // Monitor DOM mutations
  watchDOMMutations: (callback) => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        console.log('DOM mutation:', {
          type: mutation.type,
          target: mutation.target,
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length,
          attributeName: mutation.attributeName,
          oldValue: mutation.oldValue
        });
        
        if (callback) callback(mutation);
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true
    });
    
    return observer;
  },
  
  // Analyze element performance
  analyzeElementPerformance: (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    return {
      dimensions: {
        width: rect.width,
        height: rect.height,
        area: rect.width * rect.height
      },
      position: {
        x: rect.x,
        y: rect.y,
        inViewport: rect.top >= 0 && rect.left >= 0 && 
                   rect.bottom <= window.innerHeight && 
                   rect.right <= window.innerWidth
      },
      style: {
        display: computedStyle.display,
        position: computedStyle.position,
        zIndex: computedStyle.zIndex,
        transform: computedStyle.transform,
        opacity: computedStyle.opacity
      },
      children: element.children.length,
      textContent: element.textContent?.length || 0
    };
  }
};
```

## API Debugging Techniques

### Request/Response Analysis

**Advanced API Debugging:**

```javascript
// Comprehensive API debugging wrapper
class APIDebugger {
  constructor() {
    this.requests = new Map();
    this.interceptors = [];
  }
  
  // Intercept fetch requests
  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (url, options = {}) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();
      
      console.log(`[${requestId}] API Request:`, {
        url,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        timestamp: new Date().toISOString()
      });
      
      try {
        const response = await originalFetch(url, options);
        const duration = Date.now() - startTime;
        
        // Clone response to read body without consuming it
        const responseClone = response.clone();
        let responseBody;
        
        try {
          responseBody = await responseClone.text();
          if (response.headers.get('content-type')?.includes('json')) {
            responseBody = JSON.parse(responseBody);
          }
        } catch (e) {
          responseBody = '[Unable to parse response body]';
        }
        
        console.log(`[${requestId}] API Response:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody,
          duration: `${duration}ms`,
          size: responseClone.headers.get('content-length') || 'unknown'
        });
        
        // Track request metrics
        this.recordMetrics(requestId, {
          url,
          method: options.method || 'GET',
          status: response.status,
          duration,
          success: response.ok
        });
        
        return response;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        console.error(`[${requestId}] API Error:`, {
          error: error.message,
          duration: `${duration}ms`,
          url,
          method: options.method || 'GET'
        });
        
        this.recordMetrics(requestId, {
          url,
          method: options.method || 'GET',
          error: error.message,
          duration,
          success: false
        });
        
        throw error;
      }
    };
  }
  
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }
  
  recordMetrics(requestId, metrics) {
    this.requests.set(requestId, {
      ...metrics,
      timestamp: Date.now()
    });
    
    // Clean up old requests (keep last 100)
    if (this.requests.size > 100) {
      const oldestKey = this.requests.keys().next().value;
      this.requests.delete(oldestKey);
    }
  }
  
  getMetrics() {
    const requests = Array.from(this.requests.values());
    
    return {
      total: requests.length,
      success: requests.filter(r => r.success).length,
      errors: requests.filter(r => !r.success).length,
      averageDuration: requests.reduce((sum, r) => sum + r.duration, 0) / requests.length,
      slowRequests: requests.filter(r => r.duration > 1000).length,
      errorsByStatus: requests
        .filter(r => !r.success)
        .reduce((acc, r) => {
          acc[r.status || 'network'] = (acc[r.status || 'network'] || 0) + 1;
          return acc;
        }, {})
    };
  }
}

// Usage
const apiDebugger = new APIDebugger();
apiDebugger.interceptFetch();
```

### WebSocket API Debugging

**Real-time API Debugging:**

```javascript
// WebSocket debugging wrapper
class WebSocketDebugger {
  constructor(url, protocols) {
    this.messages = [];
    this.metrics = {
      connected: false,
      connectTime: null,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      reconnects: 0
    };
    
    this.ws = new WebSocket(url, protocols);
    this.setupEventListeners();
    this.startHeartbeat();
  }
  
  setupEventListeners() {
    this.ws.onopen = (event) => {
      this.metrics.connected = true;
      this.metrics.connectTime = Date.now();
      console.log('WebSocket connected:', event);
    };
    
    this.ws.onmessage = (event) => {
      this.metrics.messagesReceived++;
      
      let parsedData;
      try {
        parsedData = JSON.parse(event.data);
      } catch (e) {
        parsedData = event.data;
      }
      
      const message = {
        type: 'received',
        data: parsedData,
        timestamp: Date.now(),
        size: event.data.length
      };
      
      this.messages.push(message);
      console.log('WebSocket message received:', message);
      
      // Keep only last 50 messages
      if (this.messages.length > 50) {
        this.messages.shift();
      }
    };
    
    this.ws.onerror = (error) => {
      this.metrics.errors++;
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = (event) => {
      this.metrics.connected = false;
      console.log('WebSocket closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
    };
  }
  
  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'sent',
        data,
        timestamp: Date.now(),
        size: JSON.stringify(data).length
      };
      
      this.messages.push(message);
      this.metrics.messagesSent++;
      this.ws.send(JSON.stringify(data));
      
      console.log('WebSocket message sent:', message);
    } else {
      console.warn('WebSocket not ready, message queued');
    }
  }
  
  startHeartbeat() {
    setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000);
  }
  
  getConnectionHealth() {
    return {
      state: this.ws.readyState,
      connected: this.metrics.connected,
      uptime: this.metrics.connectTime ? Date.now() - this.metrics.connectTime : 0,
      messagesSent: this.metrics.messagesSent,
      messagesReceived: this.metrics.messagesReceived,
      errorRate: this.metrics.errors / (this.metrics.messagesSent + this.metrics.messagesReceived) * 100,
      lastMessage: this.messages[this.messages.length - 1]
    };
  }
}
```

## Real-Time Debugging

### Live Debug Console

**Real-time debugging interface:**

```javascript
// Live debugging console
class LiveDebugConsole {
  constructor() {
    this.isActive = false;
    this.debugPanel = null;
    this.logs = [];
    this.filters = {
      level: 'all',
      source: 'all',
      search: ''
    };
  }
  
  activate() {
    if (this.isActive) return;
    
    this.createDebugPanel();
    this.interceptConsole();
    this.setupKeyboardShortcuts();
    this.isActive = true;
  }
  
  createDebugPanel() {
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'live-debug-console';
    this.debugPanel.innerHTML = `
      <div class="debug-header">
        <h3>Live Debug Console</h3>
        <div class="debug-controls">
          <select id="debug-level-filter">
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <input type="text" id="debug-search" placeholder="Search logs...">
          <button id="clear-debug">Clear</button>
          <button id="close-debug">×</button>
        </div>
      </div>
      <div class="debug-content" id="debug-content"></div>
    `;
    
    // Styling
    this.debugPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 600px;
      height: 400px;
      background: #1a1a1a;
      color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 999999;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      display: flex;
      flex-direction: column;
    `;
    
    document.body.appendChild(this.debugPanel);
    this.setupPanelEvents();
  }
  
  setupPanelEvents() {
    document.getElementById('clear-debug').onclick = () => {
      this.logs = [];
      this.updateDisplay();
    };
    
    document.getElementById('close-debug').onclick = () => {
      this.deactivate();
    };
    
    document.getElementById('debug-level-filter').onchange = (e) => {
      this.filters.level = e.target.value;
      this.updateDisplay();
    };
    
    document.getElementById('debug-search').oninput = (e) => {
      this.filters.search = e.target.value.toLowerCase();
      this.updateDisplay();
    };
  }
  
  interceptConsole() {
    const originalMethods = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };
    
    Object.keys(originalMethods).forEach(method => {
      console[method] = (...args) => {
        // Call original method
        originalMethods[method].apply(console, args);
        
        // Add to debug log
        this.addLog(method, args);
      };
    });
  }
  
  addLog(level, args) {
    const logEntry = {
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      timestamp: new Date().toLocaleTimeString(),
      stack: new Error().stack
    };
    
    this.logs.push(logEntry);
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
    
    this.updateDisplay();
  }
  
  updateDisplay() {
    if (!this.debugPanel) return;
    
    const content = document.getElementById('debug-content');
    const filteredLogs = this.logs.filter(log => {
      if (this.filters.level !== 'all' && log.level !== this.filters.level) {
        return false;
      }
      
      if (this.filters.search && !log.message.toLowerCase().includes(this.filters.search)) {
        return false;
      }
      
      return true;
    });
    
    content.innerHTML = filteredLogs
      .slice(-100) // Show last 100 logs
      .map(log => `
        <div class="debug-entry debug-${log.level}">
          <span class="debug-time">${log.timestamp}</span>
          <span class="debug-level">[${log.level.toUpperCase()}]</span>
          <span class="debug-message">${log.message}</span>
        </div>
      `).join('');
    
    content.scrollTop = content.scrollHeight;
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+D to toggle debug console
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        if (this.isActive) {
          this.deactivate();
        } else {
          this.activate();
        }
      }
    });
  }
  
  deactivate() {
    if (this.debugPanel) {
      this.debugPanel.remove();
      this.debugPanel = null;
    }
    this.isActive = false;
  }
}

// Auto-activate in development
if (process.env.NODE_ENV === 'development') {
  const liveDebug = new LiveDebugConsole();
  liveDebug.activate();
}
```

## Performance Profiling

### Advanced Performance Analysis

**CPU Profiling:**

```javascript
// CPU performance profiler
class CPUProfiler {
  constructor() {
    this.profiles = new Map();
    this.isRecording = false;
  }
  
  startProfile(name) {
    if (this.isRecording) {
      console.warn('Profiling already in progress');
      return;
    }
    
    console.profile(name);
    this.isRecording = true;
    
    const profile = {
      name,
      startTime: performance.now(),
      samples: [],
      memoryBaseline: performance.memory ? { ...performance.memory } : null
    };
    
    this.profiles.set(name, profile);
    
    // Sample performance metrics
    const sampleInterval = setInterval(() => {
      if (!this.isRecording) {
        clearInterval(sampleInterval);
        return;
      }
      
      const sample = {
        timestamp: performance.now(),
        memory: performance.memory ? { ...performance.memory } : null,
        timing: performance.timing ? { ...performance.timing } : null
      };
      
      profile.samples.push(sample);
    }, 100);
    
    profile.sampleInterval = sampleInterval;
  }
  
  endProfile(name) {
    if (!this.isRecording) {
      console.warn('No active profiling session');
      return;
    }
    
    console.profileEnd(name);
    this.isRecording = false;
    
    const profile = this.profiles.get(name);
    if (profile) {
      profile.endTime = performance.now();
      profile.duration = profile.endTime - profile.startTime;
      
      clearInterval(profile.sampleInterval);
      
      // Analyze results
      const analysis = this.analyzeProfile(profile);
      console.log(`Profile "${name}" completed:`, analysis);
      
      return analysis;
    }
  }
  
  analyzeProfile(profile) {
    const memoryGrowth = profile.memoryBaseline && profile.samples.length > 0 ?
      profile.samples[profile.samples.length - 1].memory.usedJSHeapSize - profile.memoryBaseline.usedJSHeapSize : 0;
    
    return {
      duration: profile.duration,
      samples: profile.samples.length,
      memoryGrowth: memoryGrowth / (1024 * 1024), // MB
      averageMemory: profile.samples.reduce((sum, sample) => 
        sum + (sample.memory?.usedJSHeapSize || 0), 0) / profile.samples.length / (1024 * 1024),
      recommendations: this.getRecommendations(profile)
    };
  }
  
  getRecommendations(profile) {
    const recommendations = [];
    
    if (profile.duration > 1000) {
      recommendations.push('Consider optimizing for performance - operation took longer than 1 second');
    }
    
    const memoryGrowth = profile.samples.length > 0 && profile.memoryBaseline ?
      profile.samples[profile.samples.length - 1].memory.usedJSHeapSize - profile.memoryBaseline.usedJSHeapSize : 0;
    
    if (memoryGrowth > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Significant memory allocation detected - check for memory leaks');
    }
    
    return recommendations;
  }
}

// Usage
const profiler = new CPUProfiler();
profiler.startProfile('widget-rendering');
// ... code to profile
profiler.endProfile('widget-rendering');
```

### Memory Profiling

**Memory leak detection:**

```javascript
// Advanced memory leak detector
class MemoryLeakDetector {
  constructor() {
    this.snapshots = [];
    this.objectCounts = new Map();
    this.isMonitoring = false;
  }
  
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.takeSnapshot('baseline');
    
    // Monitor object creation
    this.monitorObjectCreation();
    
    // Take periodic snapshots
    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot('periodic');
      this.analyzeLeaks();
    }, 30000); // Every 30 seconds
  }
  
  stopMonitoring() {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
  
  takeSnapshot(label) {
    const snapshot = {
      label,
      timestamp: Date.now(),
      memory: performance.memory ? { ...performance.memory } : null,
      objectCounts: new Map(this.objectCounts)
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only last 20 snapshots
    if (this.snapshots.length > 20) {
      this.snapshots.shift();
    }
    
    console.log(`Memory snapshot "${label}":`, snapshot.memory);
  }
  
  monitorObjectCreation() {
    // Override object creation methods
    const originalCreate = Object.create;
    Object.create = (...args) => {
      const obj = originalCreate.apply(Object, args);
      this.trackObject(obj, 'Object');
      return obj;
    };
    
    // Monitor DOM elements
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(document, tagName);
      this.trackObject(element, `DOM:${tagName}`);
      return element;
    };
  }
  
  trackObject(obj, type) {
    const count = this.objectCounts.get(type) || 0;
    this.objectCounts.set(type, count + 1);
  }
  
  analyzeLeaks() {
    if (this.snapshots.length < 2) return;
    
    const current = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];
    
    if (!current.memory || !previous.memory) return;
    
    const memoryIncrease = current.memory.usedJSHeapSize - previous.memory.usedJSHeapSize;
    const timeElapsed = current.timestamp - previous.timestamp;
    
    if (memoryIncrease > 10 * 1024 * 1024) { // 10MB increase
      console.warn('Potential memory leak detected:', {
        memoryIncrease: (memoryIncrease / (1024 * 1024)).toFixed(2) + 'MB',
        timeElapsed: (timeElapsed / 1000).toFixed(2) + 's',
        growthRate: ((memoryIncrease / timeElapsed) * 1000 / (1024 * 1024)).toFixed(2) + 'MB/s'
      });
      
      this.identifyLeakSources();
    }
  }
  
  identifyLeakSources() {
    // Analyze object count increases
    if (this.snapshots.length < 2) return;
    
    const current = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];
    
    const leakySources = [];
    
    current.objectCounts.forEach((count, type) => {
      const previousCount = previous.objectCounts.get(type) || 0;
      const increase = count - previousCount;
      
      if (increase > 100) { // More than 100 new objects
        leakySources.push({ type, increase, total: count });
      }
    });
    
    if (leakySources.length > 0) {
      console.warn('Potential leak sources:', leakySources);
    }
  }
  
  generateReport() {
    return {
      snapshots: this.snapshots.length,
      monitoring: this.isMonitoring,
      currentMemory: performance.memory ? { ...performance.memory } : null,
      objectCounts: Object.fromEntries(this.objectCounts),
      recommendations: this.getMemoryRecommendations()
    };
  }
  
  getMemoryRecommendations() {
    const recommendations = [];
    
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      
      if (memoryUsage > 0.8) {
        recommendations.push('Memory usage is high (>80%) - consider optimizing memory usage');
      }
      
      if (this.snapshots.length >= 2) {
        const growth = this.snapshots[this.snapshots.length - 1].memory.usedJSHeapSize - 
                      this.snapshots[0].memory.usedJSHeapSize;
        
        if (growth > 100 * 1024 * 1024) { // 100MB growth
          recommendations.push('Significant memory growth detected - investigate potential leaks');
        }
      }
    }
    
    return recommendations;
  }
}

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  const memoryDetector = new MemoryLeakDetector();
  memoryDetector.startMonitoring();
  
  // Expose globally for manual testing
  window.memoryDetector = memoryDetector;
}
```

## Security Debugging

### Security Issue Detection

**Security vulnerability scanner:**

```javascript
// Security debugging tools
class SecurityDebugger {
  constructor() {
    this.vulnerabilities = [];
    this.securityChecks = new Map();
  }
  
  runSecurityAudit() {
    console.group('🔒 Security Audit');
    
    this.checkXSS();
    this.checkCSRF();
    this.checkContentSecurity();
    this.checkDataExposure();
    this.checkInputValidation();
    
    console.groupEnd();
    return this.generateSecurityReport();
  }
  
  checkXSS() {
    console.log('Checking for XSS vulnerabilities...');
    
    // Check for unescaped content
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      if (el.innerHTML.includes('<script>') || 
          el.innerHTML.includes('javascript:') ||
          el.innerHTML.includes('data:text/html')) {
        this.addVulnerability('xss', 'Potential XSS vulnerability detected', {
          element: el,
          content: el.innerHTML.substring(0, 100)
        });
      }
    });
    
    // Check for dangerous event handlers
    const dangerousEvents = ['onerror', 'onload', 'onclick'];
    dangerousEvents.forEach(event => {
      const elementsWithEvent = document.querySelectorAll(`[${event}]`);
      elementsWithEvent.forEach(el => {
        const handler = el.getAttribute(event);
        if (handler && (handler.includes('eval(') || handler.includes('Function('))) {
          this.addVulnerability('xss', 'Dangerous inline event handler', {
            element: el,
            event,
            handler
          });
        }
      });
    });
  }
  
  checkCSRF() {
    console.log('Checking for CSRF vulnerabilities...');
    
    // Check forms for CSRF tokens
    const forms = document.querySelectorAll('form[method="post"]');
    forms.forEach(form => {
      const hasToken = form.querySelector('input[name*="csrf"], input[name*="token"]');
      if (!hasToken) {
        this.addVulnerability('csrf', 'Form missing CSRF protection', {
          form: form,
          action: form.action
        });
      }
    });
  }
  
  checkContentSecurity() {
    console.log('Checking Content Security Policy...');
    
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const cspHeader = this.getResponseHeader('Content-Security-Policy');
    
    if (!cspMeta && !cspHeader) {
      this.addVulnerability('csp', 'Missing Content Security Policy', {
        recommendation: 'Add CSP headers or meta tags'
      });
    }
    
    // Check for inline styles/scripts without nonce
    const inlineScripts = document.querySelectorAll('script:not([src])');
    const inlineStyles = document.querySelectorAll('style');
    
    if (inlineScripts.length > 0 || inlineStyles.length > 0) {
      this.addVulnerability('csp', 'Inline scripts/styles detected', {
        scripts: inlineScripts.length,
        styles: inlineStyles.length,
        recommendation: 'Use nonce or move to external files'
      });
    }
  }
  
  checkDataExposure() {
    console.log('Checking for data exposure...');
    
    // Check for sensitive data in DOM
    const sensitivePatterns = [
      /password\s*[:=]\s*["']([^"']+)["']/gi,
      /api[_-]?key\s*[:=]\s*["']([^"']+)["']/gi,
      /token\s*[:=]\s*["']([^"']+)["']/gi,
      /secret\s*[:=]\s*["']([^"']+)["']/gi
    ];
    
    const htmlContent = document.documentElement.outerHTML;
    sensitivePatterns.forEach(pattern => {
      const matches = htmlContent.match(pattern);
      if (matches) {
        this.addVulnerability('data-exposure', 'Sensitive data in DOM', {
          matches: matches.length,
          pattern: pattern.source
        });
      }
    });
    
    // Check localStorage/sessionStorage
    this.checkStorageForSensitiveData();
  }
  
  checkStorageForSensitiveData() {
    const sensitiveKeys = ['password', 'token', 'key', 'secret'];
    
    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        this.addVulnerability('data-exposure', 'Sensitive data in localStorage', {
          key,
          recommendation: 'Use secure storage or encryption'
        });
      }
    }
    
    // Check sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        this.addVulnerability('data-exposure', 'Sensitive data in sessionStorage', {
          key,
          recommendation: 'Use secure storage or encryption'
        });
      }
    }
  }
  
  checkInputValidation() {
    console.log('Checking input validation...');
    
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const type = input.type || 'text';
      
      // Check for missing validation
      if (type === 'email' && !input.pattern && !input.required) {
        this.addVulnerability('validation', 'Email input without validation', {
          element: input,
          recommendation: 'Add pattern or required attribute'
        });
      }
      
      // Check for SQL injection risks
      if (input.name && input.name.toLowerCase().includes('sql')) {
        this.addVulnerability('injection', 'Potential SQL injection risk', {
          element: input,
          name: input.name
        });
      }
    });
  }
  
  addVulnerability(type, description, details) {
    this.vulnerabilities.push({
      type,
      description,
      details,
      timestamp: Date.now(),
      severity: this.getSeverity(type)
    });
    
    console.warn(`Security issue: ${description}`, details);
  }
  
  getSeverity(type) {
    const severityMap = {
      'xss': 'high',
      'csrf': 'high',
      'injection': 'critical',
      'data-exposure': 'medium',
      'csp': 'medium',
      'validation': 'low'
    };
    
    return severityMap[type] || 'low';
  }
  
  getResponseHeader(name) {
    // This would need to be implemented based on your specific needs
    // Could use XMLHttpRequest or fetch to check response headers
    return null;
  }
  
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      vulnerabilities: this.vulnerabilities,
      summary: {
        total: this.vulnerabilities.length,
        critical: this.vulnerabilities.filter(v => v.severity === 'critical').length,
        high: this.vulnerabilities.filter(v => v.severity === 'high').length,
        medium: this.vulnerabilities.filter(v => v.severity === 'medium').length,
        low: this.vulnerabilities.filter(v => v.severity === 'low').length
      },
      recommendations: this.getSecurityRecommendations()
    };
    
    console.table(report.summary);
    return report;
  }
  
  getSecurityRecommendations() {
    const recommendations = [];
    
    if (this.vulnerabilities.some(v => v.type === 'xss')) {
      recommendations.push('Implement proper input sanitization and output encoding');
    }
    
    if (this.vulnerabilities.some(v => v.type === 'csrf')) {
      recommendations.push('Add CSRF tokens to all forms');
    }
    
    if (this.vulnerabilities.some(v => v.type === 'csp')) {
      recommendations.push('Implement Content Security Policy headers');
    }
    
    if (this.vulnerabilities.some(v => v.type === 'data-exposure')) {
      recommendations.push('Remove sensitive data from client-side code and storage');
    }
    
    return recommendations;
  }
}

// Auto-run security audit in development
if (process.env.NODE_ENV === 'development') {
  const securityDebugger = new SecurityDebugger();
  window.runSecurityAudit = () => securityDebugger.runSecurityAudit();
  
  console.log('Security debugging enabled. Run window.runSecurityAudit() to scan for vulnerabilities.');
}
```

## Production Debugging Strategies

### Safe Production Debugging

**Production-safe debugging techniques:**

```javascript
// Production debugging with safety measures
class ProductionDebugger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.debugSessions = new Map();
    this.maxDebugTime = 5 * 60 * 1000; // 5 minutes
    this.debugSampling = 0.01; // Debug 1% of requests
  }
  
  startDebugSession(userId, options = {}) {
    if (!this.isAuthorized(userId)) {
      console.warn('Unauthorized debug session attempt');
      return null;
    }
    
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      userId,
      startTime: Date.now(),
      endTime: Date.now() + this.maxDebugTime,
      sampling: options.sampling || this.debugSampling,
      logs: [],
      active: true
    };
    
    this.debugSessions.set(sessionId, session);
    
    // Auto-cleanup after max time
    setTimeout(() => {
      this.endDebugSession(sessionId);
    }, this.maxDebugTime);
    
    console.log(`Debug session started: ${sessionId}`);
    return sessionId;
  }
  
  shouldDebug(sessionId) {
    const session = this.debugSessions.get(sessionId);
    if (!session || !session.active || Date.now() > session.endTime) {
      return false;
    }
    
    // Sampling-based debugging
    return Math.random() < session.sampling;
  }
  
  debugLog(sessionId, level, message, data) {
    const session = this.debugSessions.get(sessionId);
    if (!session || !this.shouldDebug(sessionId)) {
      return;
    }
    
    const logEntry = {
      level,
      message,
      data: this.sanitizeData(data),
      timestamp: Date.now(),
      stack: this.isProduction ? null : new Error().stack
    };
    
    session.logs.push(logEntry);
    
    // Limit log storage
    if (session.logs.length > 1000) {
      session.logs.shift();
    }
    
    // Console output only for non-production or authorized sessions
    if (!this.isProduction || session.authorized) {
      console[level] || console.log(`[DEBUG:${sessionId}] ${message}`, data);
    }
  }
  
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  endDebugSession(sessionId) {
    const session = this.debugSessions.get(sessionId);
    if (!session) return;
    
    session.active = false;
    session.endTime = Date.now();
    
    console.log(`Debug session ended: ${sessionId}`, {
      duration: session.endTime - session.startTime,
      logs: session.logs.length
    });
    
    // Archive session data
    this.archiveSession(session);
    
    // Cleanup
    setTimeout(() => {
      this.debugSessions.delete(sessionId);
    }, 60000); // Keep for 1 minute after ending
  }
  
  archiveSession(session) {
    // In production, you might want to send this to a logging service
    if (this.isProduction) {
      // Send to logging service
      this.sendToLoggingService(session);
    } else {
      console.log('Debug session archived:', session.id);
    }
  }
  
  sendToLoggingService(session) {
    // Implement your logging service integration
    fetch('/api/debug/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        userId: session.userId,
        duration: session.endTime - session.startTime,
        logCount: session.logs.length,
        logs: session.logs.slice(-100) // Only send last 100 logs
      })
    }).catch(error => {
      console.error('Failed to send debug session to logging service:', error);
    });
  }
  
  isAuthorized(userId) {
    // Implement your authorization logic
    const authorizedUsers = process.env.DEBUG_AUTHORIZED_USERS?.split(',') || [];
    return authorizedUsers.includes(userId) || !this.isProduction;
  }
  
  generateSessionId() {
    return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getActiveSessions() {
    return Array.from(this.debugSessions.values())
      .filter(session => session.active);
  }
  
  getSessionLogs(sessionId) {
    const session = this.debugSessions.get(sessionId);
    return session ? session.logs : [];
  }
}

// Global production debugger
const prodDebugger = new ProductionDebugger();

// Safe debugging wrapper
const safeDebug = (sessionId, level, message, data) => {
  if (sessionId && prodDebugger.shouldDebug(sessionId)) {
    prodDebugger.debugLog(sessionId, level, message, data);
  }
};

// Export for use throughout application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProductionDebugger, prodDebugger, safeDebug };
} else {
  window.prodDebugger = prodDebugger;
  window.safeDebug = safeDebug;
}
```

---

**Related Documentation:**
- [System Health Monitoring](system-health-monitoring.md)
- [Performance Optimization Tools](performance-optimization-tools.md)
- [Diagnostic Tools & Methods](diagnostic-tools-methods.md)
- [Error Message Reference](error-message-reference.md)

**Next Steps:**
- Set up advanced debugging environment
- Implement production-safe debugging
- Train team on debugging techniques
- Establish debugging procedures

For advanced debugging support, contact our technical team at debug@helpninja.ai or schedule a consultation through your dashboard.
