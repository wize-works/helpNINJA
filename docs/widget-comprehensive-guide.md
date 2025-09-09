# helpNINJA Widget - Comprehensive Integration & Customization Guide

*Complete guide for embedding, configuring, and styling the helpNINJA chat widget*

## Table of Contents
- [Quick Start](#quick-start)
- [Integration Methods](#integration-methods)
- [Configuration Options](#configuration-options)
- [Styling & Theming](#styling--theming)
- [Real-Time Configuration](#real-time-configuration)
- [Advanced Customization](#advanced-customization)
- [Framework-Specific Integration](#framework-specific-integration)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Integration

Add this script just before the closing `</body>` tag in your HTML:

```html
<!-- helpNINJA Chat Widget -->
<script>
  (function() {
    // Store configuration for client-side use
    window.helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID", 
      verificationToken: "YOUR_SITE_VERIFICATION_TOKEN",
      voice: "friendly"
    };
    
    // Load widget script
    var script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget?t=" + encodeURIComponent(window.helpNINJAConfig.tenantId) + 
                 "&s=" + encodeURIComponent(window.helpNINJAConfig.siteId) + 
                 "&k=" + encodeURIComponent(window.helpNINJAConfig.verificationToken);
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

---

## Integration Methods

### 1. Basic HTML Website

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Your website content -->
  
  <!-- helpNINJA Widget (place before closing </body>) -->
  <script>
    window.helpNINJAConfig = {
      tenantId: "pk_xxxxxxxxxxxxxxxxxxxxx",
      siteId: "your_site_id",
      verificationToken: "your_verification_token",
      voice: "friendly"
    };
  </script>
  <script src="https://helpninja.app/api/widget?t=pk_xxxxxxxxxxxxxxxxxxxxx&s=your_site_id&k=your_verification_token" async></script>
</body>
</html>
```

### 2. Next.js Applications

#### App Router (Recommended)
Create a widget component:

```tsx
// components/HelpNinjaWidget.tsx
'use client';

import { useEffect } from 'react';

interface WidgetConfig {
  tenantId: string;
  siteId: string;
  verificationToken: string;
  voice?: 'friendly' | 'professional' | 'casual' | 'formal';
}

export default function HelpNinjaWidget({ tenantId, siteId, verificationToken, voice = 'friendly' }: WidgetConfig) {
  useEffect(() => {
    // Set configuration
    (window as any).helpNINJAConfig = {
      tenantId,
      siteId,
      verificationToken,
      voice
    };

    // Load script
    const script = document.createElement('script');
    script.src = `https://helpninja.app/api/widget?t=${encodeURIComponent(tenantId)}&s=${encodeURIComponent(siteId)}&k=${encodeURIComponent(verificationToken)}`;
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
      document.head.removeChild(script);
    };
  }, [tenantId, siteId, verificationToken, voice]);

  return null;
}
```

Use in your layout:

```tsx
// app/layout.tsx
import HelpNinjaWidget from '@/components/HelpNinjaWidget';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <HelpNinjaWidget 
          tenantId="pk_xxxxxxxxxxxxxxxxxxxxx"
          siteId="your_site_id"
          verificationToken="your_verification_token"
          voice="friendly"
        />
      </body>
    </html>
  );
}
```

### 3. React Applications

```jsx
// HelpNinjaWidget.jsx
import { useEffect } from 'react';

const HelpNinjaWidget = ({ tenantId, siteId, verificationToken, voice = 'friendly' }) => {
  useEffect(() => {
    window.helpNINJAConfig = {
      tenantId,
      siteId,
      verificationToken,
      voice
    };

    const script = document.createElement('script');
    script.src = `https://helpninja.app/api/widget?t=${encodeURIComponent(tenantId)}&s=${encodeURIComponent(siteId)}&k=${encodeURIComponent(verificationToken)}`;
    script.async = true;
    document.head.appendChild(script);

    return () => document.head.removeChild(script);
  }, [tenantId, siteId, verificationToken, voice]);

  return null;
};

export default HelpNinjaWidget;
```

### 4. Vue.js Applications

```vue
<!-- HelpNinjaWidget.vue -->
<template>
  <div></div>
</template>

<script>
export default {
  name: 'HelpNinjaWidget',
  props: {
    tenantId: { type: String, required: true },
    siteId: { type: String, required: true },
    verificationToken: { type: String, required: true },
    voice: { type: String, default: 'friendly' }
  },
  mounted() {
    window.helpNINJAConfig = {
      tenantId: this.tenantId,
      siteId: this.siteId,
      verificationToken: this.verificationToken,
      voice: this.voice
    };

    const script = document.createElement('script');
    script.src = `https://helpninja.app/api/widget?t=${encodeURIComponent(this.tenantId)}&s=${encodeURIComponent(this.siteId)}&k=${encodeURIComponent(this.verificationToken)}`;
    script.async = true;
    document.head.appendChild(script);
  }
}
</script>
```

### 5. WordPress Sites

Add to your theme's `footer.php` or use a plugin:

```php
<!-- Add to footer.php before closing </body> -->
<script>
window.helpNINJAConfig = {
  tenantId: "<?php echo get_option('helpninja_tenant_id'); ?>",
  siteId: "<?php echo get_option('helpninja_site_id'); ?>", 
  verificationToken: "<?php echo get_option('helpninja_verification_token'); ?>",
  voice: "friendly"
};
</script>
<script src="https://helpninja.app/api/widget?t=<?php echo get_option('helpninja_tenant_id'); ?>&s=<?php echo get_option('helpninja_site_id'); ?>&k=<?php echo get_option('helpninja_verification_token'); ?>" async></script>
```

---

## Configuration Options

### Core Configuration

```javascript
window.helpNINJAConfig = {
  // Required
  tenantId: "pk_xxxxxxxxxxxxxxxxxxxxx",    // Your public tenant key
  siteId: "your_site_id",                  // Your site identifier
  verificationToken: "your_verification_token", // Site verification token
  
  // Behavior
  voice: "friendly",                       // 'friendly', 'professional', 'casual', 'formal'
  autoOpenDelay: 0,                       // Auto-open delay in milliseconds (0 = disabled)
  showBranding: true,                     // Show "Powered by helpNINJA" footer
  
  // Appearance
  theme: "auto",                          // 'light', 'dark', 'auto'
  position: "bottom-right",               // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
  buttonIcon: "logo",                     // 'logo', 'chat', 'help', 'message'
  primaryColor: "#3b82f6",               // Primary brand color
  
  // Content
  welcomeMessage: "Hi! How can I help you today?", // Initial message
  assistantName: "Assistant",             // AI assistant name
  placeholderText: "Type your message..." // Input placeholder
};
```

### Advanced Configuration Options

```javascript
window.helpNINJAConfig = {
  // ... basic config above ...
  
  // Custom Colors (overrides theme)
  bubbleBackground: '#3b82f6',           // Chat bubble background
  bubbleColor: '#ffffff',                // Chat bubble icon/text color
  panelBackground: '#ffffff',            // Main panel background
  panelHeaderBackground: '#f8fafc',      // Header background
  messagesBackground: '#f8fafc',         // Messages area background
  userBubbleBackground: '#3b82f6',       // User message bubble
  userBubbleColor: '#ffffff',            // User message text
  assistantBubbleBackground: '#e5e7eb',  // Assistant message bubble
  assistantBubbleColor: '#111827',       // Assistant message text
  buttonBackground: '#3b82f6',           // Send button background
  buttonColor: '#ffffff',                // Send button text
  inputBorder: '#d1d5db',               // Input field border
  inputBackground: '#ffffff',            // Input field background
  mutedTextColor: '#6b7280',            // Muted text color
  
  // Dimensions & Layout
  panelWidth: '360px',                   // Panel width
  panelHeight: '500px',                  // Panel height
  bubbleSize: '60px',                    // Chat bubble size
  
  // Animation
  animationSpeed: 300,                   // Animation duration in ms
  enableAnimations: true,                // Enable/disable animations
  
  // Advanced Behavior
  persistHistory: true,                  // Persist chat across page loads
  maxMessageLength: 1000,                // Maximum message length
  allowFileUploads: true,                // Enable file uploads
  enableFeedback: true,                  // Show feedback options
  
  // Development
  debug: false                           // Enable debug logging
};
```

---

## Styling & Theming

### Predefined Themes

#### Light Theme (Default)
```javascript
window.helpNINJAConfig = {
  theme: "light",
  // Light theme colors are applied automatically
};
```

#### Dark Theme
```javascript
window.helpNINJAConfig = {
  theme: "dark",
  // Dark theme colors:
  // - Panel: Dark backgrounds
  // - Text: Light colors
  // - Bubbles: Appropriate contrast
};
```

#### Auto Theme
```javascript
window.helpNINJAConfig = {
  theme: "auto", // Follows user's system preference
};
```

### Custom Brand Themes

#### Professional Blue
```javascript
window.helpNINJAConfig = {
  primaryColor: "#2563eb",
  bubbleBackground: "#2563eb",
  bubbleColor: "#ffffff",
  userBubbleBackground: "#2563eb",
  assistantBubbleBackground: "#eff6ff",
  assistantBubbleColor: "#1e40af"
};
```

#### Modern Green
```javascript
window.helpNINJAConfig = {
  primaryColor: "#10b981",
  bubbleBackground: "#10b981", 
  bubbleColor: "#ffffff",
  panelHeaderBackground: "#f0fdf4",
  messagesBackground: "#f0fdf4",
  userBubbleBackground: "#10b981",
  assistantBubbleBackground: "#ecfdf5",
  assistantBubbleColor: "#065f46"
};
```

#### Elegant Purple
```javascript
window.helpNINJAConfig = {
  primaryColor: "#7c3aed",
  bubbleBackground: "#7c3aed",
  bubbleColor: "#ffffff", 
  panelHeaderBackground: "#faf5ff",
  messagesBackground: "#faf5ff",
  userBubbleBackground: "#7c3aed",
  assistantBubbleBackground: "#f3e8ff",
  assistantBubbleColor: "#581c87"
};
```

#### Dark Professional
```javascript
window.helpNINJAConfig = {
  theme: "dark",
  primaryColor: "#3b82f6",
  panelBackground: "#1f2937",
  panelHeaderBackground: "#111827",
  messagesBackground: "#1f2937",
  assistantBubbleBackground: "#374151",
  assistantBubbleColor: "#ffffff"
};
```

---

## Real-Time Configuration

### Dashboard Configuration Interface

The helpNINJA dashboard provides a real-time configuration interface where you can:

1. **Visual Preview**: See changes instantly as you make them
2. **Interactive Testing**: Click elements to test functionality
3. **Live Updates**: Configuration changes apply immediately
4. **Device Preview**: Test on different screen sizes

#### Accessing Configuration
1. Navigate to **Dashboard → Widget Settings**
2. Or go to **Dashboard → Sites → [Select Site] → Configure**
3. Make changes and see them reflected in the preview
4. Click "Save Configuration" to apply changes

#### Configuration Categories

**Appearance**
- Primary Color picker with instant preview
- Theme selection (Light/Dark/Auto)
- Button icon options (Logo/Chat/Help/Message)
- Position selector (4 corners)

**Behavior** 
- Auto-open delay slider
- Branding toggle
- Animation preferences

**Content**
- Welcome message editor
- Assistant name customization
- Voice tone selector

### Programmatic Configuration

You can also update configuration programmatically:

```javascript
// Update configuration after widget loads
if (window.helpNINJAWidget) {
  window.helpNINJAWidget.updateConfig({
    primaryColor: "#ff6b35",
    welcomeMessage: "Welcome to our support!"
  });
}

// Listen for configuration changes
window.addEventListener('helpninja:configUpdated', (event) => {
  console.log('Widget config updated:', event.detail);
});
```

---

## Advanced Customization

### Custom CSS Injection

For advanced styling beyond configuration options:

```html
<style>
/* Custom widget bubble shadow */
.helpninja-widget-bubble {
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3) !important;
  border: 2px solid #3b82f6 !important;
}

/* Custom chat window styling */
.helpninja-chat-window {
  border-radius: 15px !important;
  font-family: 'Inter', sans-serif !important;
}

/* Custom message bubbles */
.helpninja-message-user {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
}

/* Custom animations */
.helpninja-message {
  animation: slideInUp 0.3s ease-out !important;
}

@keyframes slideInUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
```

### Custom Event Handlers

```javascript
// Listen for widget events
window.addEventListener('helpninja:widgetLoaded', () => {
  console.log('helpNINJA widget loaded');
});

window.addEventListener('helpninja:messageReceived', (event) => {
  console.log('New message:', event.detail.message);
  // Custom analytics tracking
  gtag('event', 'helpninja_message_received');
});

window.addEventListener('helpninja:conversationStarted', (event) => {
  console.log('Conversation started:', event.detail.conversationId);
  // Custom tracking
});
```

### Integration with Analytics

```javascript
// Google Analytics 4
window.helpNINJAConfig = {
  // ... your config ...
  onMessageSent: (message) => {
    gtag('event', 'helpninja_message_sent', {
      'message_length': message.length
    });
  },
  onConversationStart: () => {
    gtag('event', 'helpninja_conversation_start');
  }
};

// Mixpanel
window.helpNINJAConfig = {
  // ... your config ...
  onEscalation: () => {
    mixpanel.track('helpNINJA Escalation');
  }
};
```

---

## Framework-Specific Integration

### React Hook

```tsx
import { useEffect, useState } from 'react';

interface HelpNinjaConfig {
  tenantId: string;
  siteId: string;
  verificationToken: string;
  [key: string]: any;
}

export const useHelpNinja = (config: HelpNinjaConfig) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Set global config
    (window as any).helpNINJAConfig = config;

    // Load script
    const script = document.createElement('script');
    script.src = `https://helpninja.app/api/widget?t=${encodeURIComponent(config.tenantId)}&s=${encodeURIComponent(config.siteId)}&k=${encodeURIComponent(config.verificationToken)}`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    // Listen for load event
    const handleLoad = () => setIsLoaded(true);
    window.addEventListener('helpninja:widgetLoaded', handleLoad);

    return () => {
      document.head.removeChild(script);
      window.removeEventListener('helpninja:widgetLoaded', handleLoad);
    };
  }, [config]);

  return { isLoaded };
};
```

### Vue.js Composable

```javascript
// composables/useHelpNinja.js
import { ref, onMounted, onUnmounted } from 'vue';

export function useHelpNinja(config) {
  const isLoaded = ref(false);
  let script = null;

  onMounted(() => {
    window.helpNINJAConfig = config;
    
    script = document.createElement('script');
    script.src = `https://helpninja.app/api/widget?t=${encodeURIComponent(config.tenantId)}&s=${encodeURIComponent(config.siteId)}&k=${encodeURIComponent(config.verificationToken)}`;
    script.async = true;
    script.onload = () => isLoaded.value = true;
    document.head.appendChild(script);
  });

  onUnmounted(() => {
    if (script) {
      document.head.removeChild(script);
    }
  });

  return { isLoaded };
}
```

---

## Troubleshooting

### Common Issues

#### Widget Not Appearing
1. **Check credentials**: Verify tenantId, siteId, and verificationToken
2. **Check console**: Look for JavaScript errors
3. **Check network**: Ensure widget script loads successfully
4. **Check domain**: Verify domain is authorized for your site

#### Styling Issues
1. **CSS conflicts**: Check for conflicting CSS rules
2. **Z-index issues**: Widget uses z-index: 9999
3. **Theme inheritance**: Some styles may inherit from parent elements

#### Configuration Not Applying
1. **Timing**: Ensure config is set before script loads
2. **Caching**: Clear browser cache and hard refresh
3. **Syntax**: Verify configuration object syntax is correct

#### Performance Issues
1. **Script loading**: Use `async` attribute on script tag
2. **Multiple instances**: Ensure widget is only loaded once per page
3. **Large configurations**: Minimize configuration object size

### Debug Mode

Enable debug logging to troubleshoot issues:

```javascript
window.helpNINJAConfig = {
  // ... your config ...
  debug: true
};
```

This will log detailed information to the browser console.

### Browser Compatibility

The helpNINJA widget supports:
- **Chrome**: 70+
- **Firefox**: 65+
- **Safari**: 12+
- **Edge**: 79+
- **Mobile browsers**: iOS Safari 12+, Chrome Mobile 70+

### CSP (Content Security Policy)

If using CSP, add these directives:

```http
Content-Security-Policy: 
  script-src 'self' https://helpninja.app; 
  connect-src 'self' https://helpninja.app; 
  img-src 'self' https://helpninja.app data:;
```

### CORS Configuration

The widget handles CORS automatically for all authorized domains. Ensure your domain is registered in the helpNINJA dashboard.

---

## Support & Resources

- **Interactive Documentation**: [https://helpninja.app/api-docs.html](https://helpninja.app/api-docs.html)
- **Dashboard**: [https://helpninja.app/dashboard](https://helpninja.app/dashboard)
- **Support**: [https://helpninja.app/support](https://helpninja.app/support)
- **Status Page**: [https://status.helpninja.app](https://status.helpninja.app)

For advanced integrations or custom requirements, contact our support team.
