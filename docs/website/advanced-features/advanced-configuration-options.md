# Advanced Configuration Options

Unlock the full potential of helpNINJA with advanced configuration options for enterprise-level customization, performance optimization, and sophisticated integrations.

## Table of Contents

1. [Configuration Overview](#configuration-overview)
2. [Environment Configuration](#environment-configuration)
3. [Advanced Widget Configuration](#advanced-widget-configuration)
4. [API Configuration](#api-configuration)
5. [Database Configuration](#database-configuration)
6. [Security Configuration](#security-configuration)
7. [Performance Configuration](#performance-configuration)
8. [Integration Configuration](#integration-configuration)
9. [Custom Configuration Files](#custom-configuration-files)
10. [Configuration Management](#configuration-management)

## Configuration Overview

### Configuration Hierarchy

helpNINJA uses a layered configuration system for maximum flexibility:

**Configuration Layers (Priority Order):**
1. **Runtime Overrides** - API-driven configuration changes
2. **Environment Variables** - System-level configuration
3. **Custom Config Files** - Project-specific settings
4. **Dashboard Settings** - User interface configuration
5. **Default Values** - Built-in fallback settings

**Configuration Sources:**
- Environment variables (.env files)
- JSON configuration files
- Database configuration tables
- Dashboard interface
- API configuration endpoints

### Configuration Validation

All configurations are validated against schemas:

```javascript
// Configuration validation example
const configSchema = {
  widget: {
    theme: { type: 'string', enum: ['light', 'dark', 'system'] },
    position: { type: 'string', enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'] },
    autoOpenDelay: { type: 'number', min: 0, max: 30000 }
  },
  api: {
    timeout: { type: 'number', min: 1000, max: 60000 },
    retries: { type: 'number', min: 0, max: 5 },
    rateLimit: { type: 'number', min: 1, max: 10000 }
  }
};
```

## Environment Configuration

### Core Environment Variables

**Essential Configuration:**

```bash
# Core Service Configuration
HELPNINJA_API_URL=https://api.helpninja.ai
HELPNINJA_API_VERSION=v2
HELPNINJA_ENVIRONMENT=production
HELPNINJA_DEBUG_MODE=false

# Authentication & Security
HELPNINJA_API_KEY=your_api_key_here
HELPNINJA_SECRET_KEY=your_secret_key_here
HELPNINJA_JWT_SECRET=your_jwt_secret_here
HELPNINJA_ENCRYPTION_KEY=your_encryption_key_here

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000
DATABASE_SSL_MODE=require

# Redis Configuration
REDIS_URL=redis://user:password@host:port
REDIS_CLUSTER_MODE=false
REDIS_MAX_CONNECTIONS=100
REDIS_CONNECT_TIMEOUT=5000

# External Services
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

**Advanced Environment Variables:**

```bash
# Performance Configuration
HELPNINJA_WORKER_PROCESSES=4
HELPNINJA_MAX_MEMORY=2048MB
HELPNINJA_CACHE_SIZE=512MB
HELPNINJA_REQUEST_TIMEOUT=30000

# Monitoring & Logging
HELPNINJA_LOG_LEVEL=info
HELPNINJA_LOG_FORMAT=json
HELPNINJA_METRICS_ENABLED=true
HELPNINJA_TRACING_ENABLED=true
HELPNINJA_ERROR_REPORTING=true

# Feature Flags
HELPNINJA_ENABLE_ANALYTICS=true
HELPNINJA_ENABLE_WEBHOOKS=true
HELPNINJA_ENABLE_CUSTOM_CSS=true
HELPNINJA_ENABLE_WHITELIST=false

# Rate Limiting
HELPNINJA_RATE_LIMIT_WINDOW=3600
HELPNINJA_RATE_LIMIT_MAX=1000
HELPNINJA_RATE_LIMIT_SKIP_SUCCESSFUL=false
HELPNINJA_RATE_LIMIT_SKIP_FAILED=false

# File Upload Configuration
HELPNINJA_MAX_FILE_SIZE=10MB
HELPNINJA_ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,txt
HELPNINJA_UPLOAD_DESTINATION=uploads/
HELPNINJA_CDN_ENABLED=true
```

### Environment-Specific Configurations

**Development Environment:**

```bash
# .env.development
HELPNINJA_ENVIRONMENT=development
HELPNINJA_DEBUG_MODE=true
HELPNINJA_LOG_LEVEL=debug
HELPNINJA_CACHE_ENABLED=false
HELPNINJA_MINIFY_ASSETS=false
HELPNINJA_SOURCE_MAPS=true
HELPNINJA_HOT_RELOAD=true
HELPNINJA_CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Staging Environment:**

```bash
# .env.staging
HELPNINJA_ENVIRONMENT=staging
HELPNINJA_DEBUG_MODE=false
HELPNINJA_LOG_LEVEL=info
HELPNINJA_CACHE_ENABLED=true
HELPNINJA_MINIFY_ASSETS=true
HELPNINJA_SOURCE_MAPS=false
HELPNINJA_PERFORMANCE_MONITORING=true
HELPNINJA_LOAD_TESTING=true
```

**Production Environment:**

```bash
# .env.production
HELPNINJA_ENVIRONMENT=production
HELPNINJA_DEBUG_MODE=false
HELPNINJA_LOG_LEVEL=warn
HELPNINJA_CACHE_ENABLED=true
HELPNINJA_MINIFY_ASSETS=true
HELPNINJA_SOURCE_MAPS=false
HELPNINJA_PERFORMANCE_MONITORING=true
HELPNINJA_ERROR_REPORTING=true
HELPNINJA_SECURITY_HEADERS=true
```

## Advanced Widget Configuration

### Widget Configuration Schema

**Complete Widget Configuration:**

```javascript
const advancedWidgetConfig = {
  // Core Widget Settings
  core: {
    tenantId: 'your-tenant-id',
    apiBaseUrl: 'https://api.helpninja.ai',
    version: '2.4.1',
    locale: 'en-US',
    timezone: 'America/New_York'
  },
  
  // Appearance Configuration
  appearance: {
    theme: 'auto', // 'light', 'dark', 'auto', 'custom'
    position: 'bottom-right',
    zIndex: 999999,
    borderRadius: 16,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: {
      base: 14,
      small: 12,
      large: 16
    }
  },
  
  // Color Palette
  colors: {
    light: {
      primary: '#2563eb',
      secondary: '#64748b',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textMuted: '#64748b'
    },
    dark: {
      primary: '#3b82f6',
      secondary: '#94a3b8',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8'
    }
  },
  
  // Behavior Settings
  behavior: {
    autoOpen: {
      enabled: false,
      delay: 3000,
      conditions: {
        scrollPercentage: 50,
        timeOnPage: 10000,
        exitIntent: true,
        firstVisit: true
      }
    },
    
    minimizeOnNoActivity: {
      enabled: true,
      timeout: 60000
    },
    
    persistConversation: {
      enabled: true,
      duration: 86400000, // 24 hours
      storage: 'localStorage'
    },
    
    notifications: {
      desktop: false,
      sound: false,
      vibration: false
    }
  },
  
  // Advanced Features
  advanced: {
    customCSS: '',
    customJS: '',
    webhooks: {
      onMessage: 'https://your-domain.com/webhook/message',
      onConversationStart: 'https://your-domain.com/webhook/start',
      onConversationEnd: 'https://your-domain.com/webhook/end'
    },
    
    analytics: {
      googleAnalytics: 'GA_MEASUREMENT_ID',
      customEvents: true,
      trackScrollDepth: true,
      trackTimeOnPage: true
    },
    
    security: {
      contentSecurityPolicy: 'default-src \'self\'; script-src \'self\' \'unsafe-inline\'',
      allowedDomains: ['your-domain.com', '*.your-domain.com'],
      rateLimiting: {
        enabled: true,
        maxRequests: 100,
        timeWindow: 3600000
      }
    }
  },
  
  // Integration Settings
  integrations: {
    crm: {
      enabled: false,
      provider: 'salesforce',
      apiKey: 'your-crm-api-key',
      syncFields: ['name', 'email', 'company']
    },
    
    helpdesk: {
      enabled: false,
      provider: 'zendesk',
      apiKey: 'your-helpdesk-api-key',
      autoCreateTickets: true
    },
    
    analytics: {
      mixpanel: {
        token: 'your-mixpanel-token',
        trackEvents: ['message_sent', 'conversation_started']
      },
      hotjar: {
        hjid: 'your-hotjar-id',
        hjsv: 6
      }
    }
  }
};
```

### Dynamic Configuration Updates

**Runtime Configuration Updates:**

```javascript
// Update configuration at runtime
const updateWidgetConfig = async (updates) => {
  try {
    const response = await fetch('/api/widget/config', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify(updates)
    });
    
    if (response.ok) {
      const newConfig = await response.json();
      
      // Apply configuration changes
      if (window.helpNinjaWidget) {
        window.helpNinjaWidget.updateConfig(newConfig);
      }
      
      return newConfig;
    }
  } catch (error) {
    console.error('Failed to update configuration:', error);
    throw error;
  }
};

// Example: Update theme at runtime
updateWidgetConfig({
  appearance: {
    theme: 'dark'
  }
});
```

### Conditional Configuration

**Configuration based on conditions:**

```javascript
const conditionalConfig = {
  rules: [
    {
      condition: {
        userAgent: /mobile/i,
        screenWidth: { max: 768 }
      },
      config: {
        appearance: {
          position: 'bottom-center',
          width: '100%',
          height: '60%'
        }
      }
    },
    {
      condition: {
        country: 'US',
        timezone: /America\/.*/
      },
      config: {
        core: {
          locale: 'en-US',
          currency: 'USD'
        }
      }
    },
    {
      condition: {
        plan: 'enterprise',
        customDomain: true
      },
      config: {
        advanced: {
          whiteLabeling: true,
          customBranding: true,
          advancedAnalytics: true
        }
      }
    }
  ]
};
```

## API Configuration

### API Client Configuration

**Advanced API Configuration:**

```javascript
const apiConfig = {
  // Base Configuration
  baseURL: 'https://api.helpninja.ai/v2',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'helpNINJA-Client/2.4.1'
  },
  
  // Authentication
  auth: {
    type: 'bearer', // 'bearer', 'basic', 'api-key'
    token: process.env.HELPNINJA_API_KEY,
    refreshToken: process.env.HELPNINJA_REFRESH_TOKEN,
    autoRefresh: true
  },
  
  // Retry Configuration
  retry: {
    retries: 3,
    retryDelay: 1000,
    retryCondition: (error) => {
      return error.response?.status >= 500 || error.code === 'ECONNABORTED';
    },
    exponentialBackoff: true,
    maxRetryDelay: 30000
  },
  
  // Request/Response Interceptors
  interceptors: {
    request: [
      {
        onFulfilled: (config) => {
          // Add correlation ID
          config.headers['X-Correlation-ID'] = generateCorrelationId();
          
          // Add timestamp
          config.headers['X-Request-Time'] = Date.now();
          
          return config;
        },
        onRejected: (error) => Promise.reject(error)
      }
    ],
    
    response: [
      {
        onFulfilled: (response) => {
          // Log response time
          const requestTime = response.config.headers['X-Request-Time'];
          const responseTime = Date.now() - requestTime;
          
          console.log(`API Response: ${response.config.url} (${responseTime}ms)`);
          
          return response;
        },
        onRejected: (error) => {
          // Enhanced error handling
          if (error.response) {
            console.error('API Error:', {
              status: error.response.status,
              message: error.response.data?.message,
              url: error.config.url,
              correlationId: error.config.headers['X-Correlation-ID']
            });
          }
          
          return Promise.reject(error);
        }
      }
    ]
  },
  
  // Caching Configuration
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 100,
    strategy: 'lru', // 'lru', 'fifo', 'lfu'
    keyGenerator: (config) => {
      return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
    }
  },
  
  // Rate Limiting
  rateLimiting: {
    enabled: true,
    maxRequests: 100,
    timeWindow: 60000, // 1 minute
    strategy: 'sliding-window',
    queueRequests: true,
    maxQueueSize: 50
  }
};
```

### API Endpoint Configuration

**Custom API Endpoints:**

```javascript
const endpointConfig = {
  endpoints: {
    // Chat Endpoints
    chat: {
      send: {
        method: 'POST',
        url: '/chat/send',
        timeout: 10000,
        retries: 2
      },
      history: {
        method: 'GET',
        url: '/chat/history',
        cache: true,
        ttl: 300000
      }
    },
    
    // Widget Endpoints
    widget: {
      config: {
        method: 'GET',
        url: '/widget/config',
        cache: true,
        ttl: 600000
      },
      analytics: {
        method: 'POST',
        url: '/widget/analytics',
        batch: true,
        batchSize: 10,
        batchTimeout: 5000
      }
    },
    
    // File Upload
    upload: {
      files: {
        method: 'POST',
        url: '/upload/files',
        timeout: 60000,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/*', 'application/pdf', 'text/plain']
      }
    }
  },
  
  // Environment-specific overrides
  environments: {
    development: {
      baseURL: 'http://localhost:3001/api',
      timeout: 60000,
      debug: true
    },
    staging: {
      baseURL: 'https://staging-api.helpninja.ai/v2',
      timeout: 45000
    },
    production: {
      baseURL: 'https://api.helpninja.ai/v2',
      timeout: 30000,
      compression: true
    }
  }
};
```

## Database Configuration

### PostgreSQL Advanced Configuration

**Database Connection Configuration:**

```javascript
const databaseConfig = {
  // Connection Settings
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'helpninja',
    user: process.env.DB_USER || 'helpninja_user',
    password: process.env.DB_PASSWORD,
    
    // SSL Configuration
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false,
      ca: process.env.DB_SSL_CA,
      key: process.env.DB_SSL_KEY,
      cert: process.env.DB_SSL_CERT
    } : false,
    
    // Connection Pool
    max: parseInt(process.env.DB_POOL_SIZE) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    acquireTimeoutMillis: 10000,
    
    // Advanced Settings
    statement_timeout: 30000,
    query_timeout: 30000,
    application_name: 'helpninja-api',
    timezone: 'UTC'
  },
  
  // Query Configuration
  query: {
    // Default query options
    defaults: {
      timeout: 30000,
      maxRows: 10000,
      preparedStatements: true
    },
    
    // Query logging
    logging: {
      enabled: process.env.DB_LOG_QUERIES === 'true',
      minDuration: 1000, // Log queries > 1 second
      logLevel: 'info',
      logParameters: process.env.NODE_ENV !== 'production'
    }
  },
  
  // Migrations
  migrations: {
    directory: './migrations',
    tableName: 'migrations',
    schemaName: 'public',
    disableTransactions: false,
    loadExtensions: ['.js', '.sql']
  },
  
  // Backup Configuration
  backup: {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    retention: 30, // Keep 30 days
    compression: true,
    encryption: true,
    location: process.env.BACKUP_LOCATION || './backups'
  }
};
```

### Database Performance Configuration

**Performance Optimization Settings:**

```sql
-- PostgreSQL performance configuration
-- postgresql.conf settings

-- Memory Configuration
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

-- Connection Settings
max_connections = 100
superuser_reserved_connections = 3

-- Query Planning
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 100

-- Write Ahead Logging
wal_buffers = 16MB
checkpoint_completion_target = 0.9
checkpoint_timeout = 10min
max_wal_size = 1GB
min_wal_size = 80MB

-- Background Writer
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0

-- Logging Configuration
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'none'
log_temp_files = 10MB
```

## Security Configuration

### Advanced Security Settings

**Comprehensive Security Configuration:**

```javascript
const securityConfig = {
  // Authentication
  authentication: {
    // JWT Configuration
    jwt: {
      secret: process.env.JWT_SECRET,
      algorithm: 'HS256',
      expiresIn: '24h',
      issuer: 'helpninja-api',
      audience: 'helpninja-client',
      clockTolerance: 30
    },
    
    // Session Configuration
    session: {
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      }
    },
    
    // API Key Configuration
    apiKey: {
      headerName: 'X-API-Key',
      queryParam: 'api_key',
      encryption: 'aes-256-gcm',
      rotation: {
        enabled: true,
        interval: 30 * 24 * 60 * 60 * 1000 // 30 days
      }
    }
  },
  
  // CORS Configuration
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID'],
    maxAge: 86400 // 24 hours
  },
  
  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.helpninja.ai'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.helpninja.ai'],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
    reportOnly: false,
    reportUri: '/api/csp-report'
  },
  
  // Rate Limiting
  rateLimiting: {
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false
    },
    
    api: {
      windowMs: 60 * 1000, // 1 minute
      max: 100,
      keyGenerator: (req) => {
        return req.user?.id || req.ip;
      }
    },
    
    auth: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    }
  },
  
  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    saltLength: 32,
    ivLength: 16,
    tagLength: 16,
    iterations: 100000
  },
  
  // Input Validation
  validation: {
    // JSON Schema validation
    schemas: {
      message: {
        type: 'object',
        required: ['content', 'type'],
        properties: {
          content: { type: 'string', maxLength: 4000 },
          type: { type: 'string', enum: ['user', 'assistant'] },
          attachments: { type: 'array', maxItems: 5 }
        }
      }
    },
    
    // Sanitization rules
    sanitization: {
      html: {
        allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
        allowedAttributes: {},
        disallowedTagsMode: 'discard'
      }
    }
  }
};
```

### Security Headers Configuration

**HTTP Security Headers:**

```javascript
const securityHeaders = {
  // Helmet.js configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'nonce-{nonce}'"],
        styleSrc: ["'self'", "'nonce-{nonce}'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.helpninja.ai'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    
    permittedCrossDomainPolicies: false,
    hidePoweredBy: true,
    
    expectCt: {
      maxAge: 86400,
      enforce: true,
      reportUri: '/api/expect-ct-report'
    }
  },
  
  // Custom security headers
  custom: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site'
  }
};
```

## Performance Configuration

### Caching Configuration

**Multi-Layer Caching Strategy:**

```javascript
const cachingConfig = {
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    
    // Connection pool
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    connectTimeout: 5000,
    commandTimeout: 5000,
    
    // Cluster configuration (if applicable)
    cluster: {
      enableReadyCheck: false,
      redisOptions: {
        password: process.env.REDIS_PASSWORD
      }
    }
  },
  
  // Cache Strategies
  strategies: {
    // LRU Cache for in-memory caching
    memory: {
      max: 1000,
      maxAge: 10 * 60 * 1000, // 10 minutes
      stale: true,
      updateAgeOnGet: true
    },
    
    // API Response Caching
    api: {
      defaultTTL: 300, // 5 minutes
      maxTTL: 3600,   // 1 hour
      
      rules: [
        {
          pattern: '/api/widget/config',
          ttl: 1800, // 30 minutes
          varyBy: ['tenantId']
        },
        {
          pattern: '/api/chat/history',
          ttl: 300,  // 5 minutes
          varyBy: ['sessionId', 'limit']
        }
      ]
    },
    
    // Database Query Caching
    database: {
      enabled: true,
      ttl: 600, // 10 minutes
      keyPrefix: 'db:',
      
      strategies: {
        'SELECT': { ttl: 300, enabled: true },
        'INSERT': { ttl: 0, enabled: false },
        'UPDATE': { ttl: 0, enabled: false },
        'DELETE': { ttl: 0, enabled: false }
      }
    }
  },
  
  // Cache Invalidation
  invalidation: {
    patterns: [
      {
        trigger: 'tenant.config.update',
        invalidate: [
          'api:widget:config:${tenantId}',
          'db:tenant:${tenantId}:*'
        ]
      },
      {
        trigger: 'message.create',
        invalidate: [
          'api:chat:history:${sessionId}',
          'db:conversation:${conversationId}:*'
        ]
      }
    ]
  }
};
```

### Performance Optimization Settings

**System Performance Configuration:**

```javascript
const performanceConfig = {
  // Node.js Optimization
  node: {
    // V8 Options
    v8Options: [
      '--max-old-space-size=4096',
      '--optimize-for-size',
      '--gc-interval=100',
      '--expose-gc'
    ],
    
    // Cluster Configuration
    cluster: {
      enabled: process.env.NODE_ENV === 'production',
      workers: process.env.WEB_CONCURRENCY || require('os').cpus().length,
      respawn: true,
      maxRestarts: 5,
      restartDelay: 1000
    }
  },
  
  // Request Processing
  request: {
    // Body Parser Limits
    bodyParser: {
      json: { limit: '10mb' },
      urlencoded: { limit: '10mb', extended: true },
      text: { limit: '1mb' },
      raw: { limit: '50mb' }
    },
    
    // Compression
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        return compression.filter(req, res);
      }
    },
    
    // Keep-Alive
    keepAlive: {
      enabled: true,
      timeout: 5000,
      maxKeepAliveRequests: 1000
    }
  },
  
  // Static Asset Optimization
  staticAssets: {
    // Caching
    cache: {
      maxAge: 31536000, // 1 year
      etag: true,
      lastModified: true,
      immutable: true
    },
    
    // Compression
    compression: {
      gzip: true,
      brotli: true,
      threshold: 1024
    },
    
    // CDN Configuration
    cdn: {
      enabled: process.env.CDN_ENABLED === 'true',
      baseUrl: process.env.CDN_BASE_URL,
      domains: process.env.CDN_DOMAINS?.split(',') || []
    }
  },
  
  // Database Performance
  database: {
    // Connection Pool Optimization
    pool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    
    // Query Optimization
    query: {
      timeout: 30000,
      maxRows: 10000,
      preparedStatements: true,
      
      // Query analysis
      explain: {
        enabled: process.env.NODE_ENV === 'development',
        threshold: 1000 // Analyze queries > 1 second
      }
    }
  }
};
```

## Integration Configuration

### Third-Party Service Configuration

**External Service Integration Settings:**

```javascript
const integrationConfig = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID,
    
    models: {
      chat: process.env.OPENAI_CHAT_MODEL || 'gpt-4',
      embedding: process.env.OPENAI_EMBED_MODEL || 'text-embedding-ada-002'
    },
    
    parameters: {
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
      topP: parseFloat(process.env.OPENAI_TOP_P) || 1.0,
      frequencyPenalty: parseFloat(process.env.OPENAI_FREQ_PENALTY) || 0.0,
      presencePenalty: parseFloat(process.env.OPENAI_PRESENCE_PENALTY) || 0.0
    },
    
    // Rate Limiting
    rateLimiting: {
      requestsPerMinute: 60,
      tokensPerMinute: 150000,
      requestsPerDay: 3000
    },
    
    // Retry Configuration
    retry: {
      attempts: 3,
      backoff: 'exponential',
      baseDelay: 1000,
      maxDelay: 10000
    }
  },
  
  // Stripe Configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    
    // API Configuration
    apiVersion: '2023-10-16',
    timeout: 20000,
    maxNetworkRetries: 2,
    
    // Webhook Configuration
    webhooks: {
      tolerance: 300, // 5 minutes
      endpoints: [
        {
          url: '/api/stripe/webhook',
          events: [
            'invoice.payment_succeeded',
            'invoice.payment_failed',
            'customer.subscription.updated',
            'customer.subscription.deleted'
          ]
        }
      ]
    }
  },
  
  // Email Service (Resend)
  email: {
    apiKey: process.env.RESEND_API_KEY,
    domain: process.env.EMAIL_DOMAIN || 'helpninja.ai',
    
    // Default Settings
    defaults: {
      from: process.env.EMAIL_FROM || 'noreply@helpninja.ai',
      replyTo: process.env.EMAIL_REPLY_TO,
      
      // Templates
      templates: {
        welcome: 'welcome-template-id',
        passwordReset: 'password-reset-template-id',
        invoiceReminder: 'invoice-reminder-template-id'
      }
    },
    
    // Rate Limiting
    rateLimiting: {
      perSecond: 14,
      perMinute: 100,
      perHour: 1000,
      perDay: 10000
    }
  },
  
  // Analytics Services
  analytics: {
    // Google Analytics
    googleAnalytics: {
      measurementId: process.env.GA_MEASUREMENT_ID,
      apiSecret: process.env.GA_API_SECRET,
      
      customDimensions: {
        tenantId: 'custom_dimension_1',
        userPlan: 'custom_dimension_2',
        userSegment: 'custom_dimension_3'
      }
    },
    
    // Mixpanel
    mixpanel: {
      token: process.env.MIXPANEL_TOKEN,
      secret: process.env.MIXPANEL_SECRET,
      
      // Event Configuration
      events: {
        track: true,
        people: true,
        groups: false
      },
      
      // Data Processing
      batch: {
        size: 50,
        flushInterval: 10000
      }
    }
  },
  
  // Webhook Configuration
  webhooks: {
    // Global webhook settings
    global: {
      timeout: 30000,
      retries: 3,
      backoff: 'exponential',
      
      // Security
      signatureHeader: 'X-Webhook-Signature',
      timestampHeader: 'X-Webhook-Timestamp',
      timestampTolerance: 300, // 5 minutes
      
      // Payload
      contentType: 'application/json',
      userAgent: 'helpNINJA-Webhook/1.0'
    },
    
    // Custom webhook endpoints
    endpoints: [
      {
        name: 'message-created',
        url: process.env.WEBHOOK_MESSAGE_CREATED,
        events: ['message.created'],
        secret: process.env.WEBHOOK_SECRET_MESSAGE
      },
      {
        name: 'conversation-ended',
        url: process.env.WEBHOOK_CONVERSATION_ENDED,
        events: ['conversation.ended'],
        secret: process.env.WEBHOOK_SECRET_CONVERSATION
      }
    ]
  }
};
```

## Custom Configuration Files

### JSON Configuration Files

**Custom configuration file structure:**

```json
// config/custom.json
{
  "app": {
    "name": "helpNINJA",
    "version": "2.4.1",
    "environment": "production",
    "debug": false
  },
  
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "timeout": 30000,
    "keepAliveTimeout": 5000
  },
  
  "features": {
    "analytics": {
      "enabled": true,
      "providers": ["google", "mixpanel"],
      "sampleRate": 1.0
    },
    
    "fileUpload": {
      "enabled": true,
      "maxSize": "10MB",
      "allowedTypes": ["image/*", "application/pdf", "text/plain"],
      "storage": "s3"
    },
    
    "rateLimit": {
      "enabled": true,
      "window": 900000,
      "max": 1000,
      "skipSuccessful": false
    }
  },
  
  "integrations": {
    "openai": {
      "model": "gpt-4",
      "temperature": 0.7,
      "maxTokens": 2000
    },
    
    "database": {
      "ssl": true,
      "poolSize": 20,
      "timeout": 30000
    },
    
    "redis": {
      "cluster": false,
      "maxConnections": 100,
      "timeout": 5000
    }
  },
  
  "monitoring": {
    "metrics": {
      "enabled": true,
      "interval": 60000,
      "endpoint": "/metrics"
    },
    
    "logging": {
      "level": "info",
      "format": "json",
      "rotation": {
        "enabled": true,
        "maxFiles": 10,
        "maxSize": "100MB"
      }
    }
  }
}
```

### YAML Configuration Files

**YAML configuration example:**

```yaml
# config/application.yml
application:
  name: helpNINJA
  version: 2.4.1
  environment: production
  
server:
  port: 3000
  host: 0.0.0.0
  ssl:
    enabled: true
    cert: /path/to/cert.pem
    key: /path/to/key.pem
  
database:
  host: localhost
  port: 5432
  name: helpninja
  pool:
    min: 5
    max: 20
    timeout: 30000
  
cache:
  redis:
    host: localhost
    port: 6379
    db: 0
    cluster: false
  
  strategies:
    api:
      ttl: 300
      max: 1000
    
    database:
      ttl: 600
      enabled: true

security:
  cors:
    enabled: true
    origins:
      - "https://app.helpninja.ai"
      - "https://*.helpninja.ai"
  
  csp:
    enabled: true
    reportOnly: false
  
  rateLimit:
    window: 900000
    max: 1000
    
features:
  analytics:
    enabled: true
    sampling: 1.0
  
  webhooks:
    enabled: true
    timeout: 30000
  
  fileUpload:
    enabled: true
    maxSize: 10485760 # 10MB
```

## Configuration Management

### Environment-Based Configuration

**Configuration management system:**

```javascript
// config/index.js
const path = require('path');
const fs = require('fs');

class ConfigurationManager {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.config = {};
    this.loadConfiguration();
  }
  
  loadConfiguration() {
    // Load base configuration
    this.loadFile('config/default.json');
    
    // Load environment-specific configuration
    this.loadFile(`config/${this.env}.json`);
    
    // Load local overrides (not in version control)
    this.loadFile('config/local.json', true);
    
    // Apply environment variables
    this.applyEnvironmentVariables();
    
    // Validate configuration
    this.validateConfiguration();
  }
  
  loadFile(filePath, optional = false) {
    const fullPath = path.resolve(filePath);
    
    try {
      if (fs.existsSync(fullPath)) {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const parsedContent = JSON.parse(fileContent);
        this.mergeConfig(parsedContent);
      } else if (!optional) {
        console.warn(`Configuration file not found: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error loading configuration file ${filePath}:`, error);
    }
  }
  
  mergeConfig(newConfig) {
    this.config = this.deepMerge(this.config, newConfig);
  }
  
  deepMerge(target, source) {
    const output = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    });
    
    return output;
  }
  
  applyEnvironmentVariables() {
    const envMappings = {
      'PORT': 'server.port',
      'HOST': 'server.host',
      'DATABASE_URL': 'database.url',
      'REDIS_URL': 'cache.redis.url',
      'OPENAI_API_KEY': 'integrations.openai.apiKey',
      'STRIPE_SECRET_KEY': 'integrations.stripe.secretKey'
    };
    
    Object.entries(envMappings).forEach(([envVar, configPath]) => {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        this.setNestedValue(this.config, configPath, envValue);
      }
    });
  }
  
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  validateConfiguration() {
    const required = [
      'server.port',
      'database.url',
      'integrations.openai.apiKey'
    ];
    
    const missing = required.filter(path => {
      return this.getNestedValue(this.config, path) === undefined;
    });
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key];
    }, obj);
  }
  
  get(path, defaultValue) {
    const value = this.getNestedValue(this.config, path);
    return value !== undefined ? value : defaultValue;
  }
  
  set(path, value) {
    this.setNestedValue(this.config, path, value);
  }
  
  has(path) {
    return this.getNestedValue(this.config, path) !== undefined;
  }
  
  getAll() {
    return { ...this.config };
  }
}

// Export singleton instance
module.exports = new ConfigurationManager();
```

### Configuration Validation

**Schema validation for configurations:**

```javascript
const Joi = require('joi');

const configSchema = Joi.object({
  server: Joi.object({
    port: Joi.number().port().required(),
    host: Joi.string().required(),
    timeout: Joi.number().min(1000).max(300000).default(30000)
  }).required(),
  
  database: Joi.object({
    url: Joi.string().uri().required(),
    pool: Joi.object({
      min: Joi.number().min(0).default(5),
      max: Joi.number().min(1).default(20),
      timeout: Joi.number().min(1000).default(30000)
    })
  }).required(),
  
  integrations: Joi.object({
    openai: Joi.object({
      apiKey: Joi.string().required(),
      model: Joi.string().default('gpt-4'),
      temperature: Joi.number().min(0).max(2).default(0.7),
      maxTokens: Joi.number().min(1).max(4000).default(2000)
    }).required(),
    
    stripe: Joi.object({
      secretKey: Joi.string().when('...features.billing.enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    })
  }).required(),
  
  features: Joi.object({
    analytics: Joi.object({
      enabled: Joi.boolean().default(true),
      sampling: Joi.number().min(0).max(1).default(1.0)
    }),
    
    billing: Joi.object({
      enabled: Joi.boolean().default(true)
    }),
    
    fileUpload: Joi.object({
      enabled: Joi.boolean().default(true),
      maxSize: Joi.string().pattern(/^\d+[KMGT]?B$/i).default('10MB'),
      allowedTypes: Joi.array().items(Joi.string()).default(['image/*', 'application/pdf'])
    })
  })
});

// Validation function
function validateConfiguration(config) {
  const { error, value } = configSchema.validate(config, {
    allowUnknown: true,
    stripUnknown: false
  });
  
  if (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }
  
  return value;
}

module.exports = { configSchema, validateConfiguration };
```

---

**Related Documentation:**
- [Performance Optimization](performance-optimization.md)
- [Security Best Practices](../troubleshooting/security-debugging.md)
- [API Integration Guide](../integrations/api-integrations.md)
- [System Health Monitoring](../troubleshooting/system-health-monitoring.md)

**Next Steps:**
- Review current configuration setup
- Implement advanced configuration options
- Set up configuration validation
- Document custom configuration requirements

For configuration assistance, contact our technical team at config@helpninja.ai or consult the configuration wizard in your dashboard.
