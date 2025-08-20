---
title: "Integrating the helpNINJA Widget"
description: "Learn how to add the helpNINJA AI chat widget to your website or application across different frameworks and environments."
slug: "/help/widget-integration"
date: "2025-08-19"
lastUpdated: "2025-08-19"
author: "helpNINJA Team"
authorAvatar: "/images/avatar-ninja.png"
category: "Integration Guides"
tags: ["widget", "integration", "setup", "javascript", "react", "next.js", "vue", "angular", "wordpress"]
---

# Integrating the helpNINJA Widget

Adding the helpNINJA AI chat widget to your website or application is straightforward and supports various frameworks and environments. This guide walks you through the integration options and customization possibilities.

## Quick Start

For the fastest integration, add this script to your website:

```html
<script async src="https://helpninja.app/api/widget?t=YOUR_TENANT_PUBLIC_KEY&s=YOUR_SITE_ID&k=YOUR_SITE_SCRIPT_KEY"></script>
```

Replace the placeholder values with your actual credentials from the helpNINJA dashboard.

## Integration Options

Choose the integration method that best matches your website or application's technology stack.

### Basic HTML Website

Add this script just before the closing `</body>` tag in your HTML:

```html
<!-- helpNINJA Chat Widget -->
<script>
  (function() {
    window.helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      scriptKey: "YOUR_SITE_SCRIPT_KEY"
    };
    var script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget";
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

### Next.js Applications

For Next.js applications, we recommend using the `next/script` component:

```jsx
import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <>
      {children}
      
      {/* helpNINJA Widget */}
      <Script
        id="help-ninja-widget"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              window.helpNINJAConfig = {
                tenantId: "YOUR_TENANT_PUBLIC_KEY",
                siteId: "YOUR_SITE_ID",
                scriptKey: "YOUR_SITE_SCRIPT_KEY"
              };
              var script = document.createElement("script");
              script.src = "https://helpninja.app/api/widget";
              script.async = true;
              document.head.appendChild(script);
            })();
          `
        }}
      />
    </>
  );
}
```

#### App Router Component

For the App Router, you can create a client component:

```jsx
'use client';

import { useEffect } from 'react';

export default function HelpNinjaWidget() {
  useEffect(() => {
    window.helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      scriptKey: "YOUR_SITE_SCRIPT_KEY"
    };

    const script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://helpninja.app/api/widget"]');
      if (existingScript) document.head.removeChild(existingScript);
    };
  }, []);

  return null;
}
```

Then use it in your layout:

```jsx
import HelpNinjaWidget from '@/components/help-ninja-widget';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <HelpNinjaWidget />
      </body>
    </html>
  );
}
```

### React Applications

For React applications:

```jsx
import { useEffect } from 'react';

function HelpNinjaWidget() {
  useEffect(() => {
    // Set configuration
    window.helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      scriptKey: "YOUR_SITE_SCRIPT_KEY"
    };

    // Create and load script
    const script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget";
    script.async = true;
    document.head.appendChild(script);

    // Clean up on unmount
    return () => {
      const existingScript = document.querySelector('script[src="https://helpninja.app/api/widget"]');
      if (existingScript) document.head.removeChild(existingScript);
    };
  }, []);

  return null;
}

// Use in your app component:
// <HelpNinjaWidget />
```

### Vue.js Applications

For Vue.js applications:

```vue
<!-- In your App.vue or a layout component -->
<template>
  <div>
    <!-- Your app content -->
  </div>
</template>

<script>
export default {
  name: 'App',
  mounted() {
    // Set configuration
    window.helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      scriptKey: "YOUR_SITE_SCRIPT_KEY"
    };

    // Create and load script
    const script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget";
    script.async = true;
    document.head.appendChild(script);
  },
  beforeUnmount() {
    // Clean up
    const script = document.querySelector('script[src="https://helpninja.app/api/widget"]');
    if (script) document.head.removeChild(script);
  }
}
</script>
```

### Angular Applications

For Angular applications:

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  private script: HTMLScriptElement | null = null;

  ngOnInit() {
    // Set configuration
    (window as any).helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      scriptKey: "YOUR_SITE_SCRIPT_KEY"
    };

    // Create and load script
    this.script = document.createElement("script");
    this.script.src = "https://helpninja.app/api/widget";
    this.script.async = true;
    document.head.appendChild(this.script);
  }

  ngOnDestroy() {
    // Clean up
    if (this.script) document.head.removeChild(this.script);
  }
}
```

### WordPress Sites

For WordPress sites, add this to your theme's functions.php file:

```php
/**
 * Add helpNINJA Chat Widget
 */
function add_helpninja_widget() {
    ?>
    <!-- helpNINJA Chat Widget -->
    <script>
      (function() {
        window.helpNINJAConfig = {
          tenantId: "<?php echo 'YOUR_TENANT_PUBLIC_KEY'; ?>",
          siteId: "<?php echo 'YOUR_SITE_ID'; ?>",
          scriptKey: "<?php echo 'YOUR_SITE_SCRIPT_KEY'; ?>"
        };
        var script = document.createElement("script");
        script.src = "<?php echo 'https://helpninja.app/api/widget'; ?>";
        script.async = true;
        document.head.appendChild(script);
      })();
    </script>
    <?php
}
add_action('wp_footer', 'add_helpninja_widget');
```

For WordPress sites using a plugin:

1. Install the "Insert Headers and Footers" plugin
2. Go to Settings → Insert Headers and Footers
3. Add the widget script to the footer section
4. Save changes

## Widget Configuration Options

The helpNINJA widget supports various configuration options to match your brand and user experience requirements:

| Option | Description | Default Value |
|--------|-------------|---------------|
| primaryColor | Main color for the widget | "#7C3AED" |
| position | Position on the screen (bottom-right, bottom-left, top-right, top-left) | "bottom-right" |
| welcomeMessage | Initial message shown to users | "👋 Hi there! How can I help you today?" |
| aiName | Name of the AI assistant | "AI Assistant" |
| showBranding | Whether to show helpNINJA branding | true |
| autoOpenDelay | Delay in ms before auto-opening (0 = disabled) | 0 |
| buttonIcon | Icon style for chat button | "default" |
| theme | Widget color theme (light, dark, auto) | "auto" |
| voice | AI voice style (friendly, professional, casual, formal) | "friendly" |

### Configuration Example

```html
<script>
  (function() {
    window.helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      scriptKey: "YOUR_SITE_SCRIPT_KEY",
      primaryColor: "#2563EB",
      position: "bottom-left",
      welcomeMessage: "Hello! How may I assist you today?",
      aiName: "Support Assistant",
      showBranding: false,
      theme: "light",
      voice: "professional"
    };
    var script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget";
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

## Managing Site-Specific Configuration

For multi-site setups, you can configure the widget differently for each site:

1. Log into your helpNINJA dashboard
2. Navigate to the Sites section
3. Select a site from your list
4. Click "Configure Widget"
5. Customize the settings in the configuration tabs
6. Save your changes

Configuration changes take effect immediately for all visitors.

## Advanced Features

### Programmatic Control

You can control the widget programmatically from your website:

```javascript
// Open the widget
window.helpNINJA.open();

// Close the widget
window.helpNINJA.close();

// Send a message programmatically
window.helpNINJA.sendMessage("What are your business hours?");

// Check if widget is open
const isOpen = window.helpNINJA.isOpen();
```

### Custom Triggers

You can create custom triggers to open the widget:

```html
<button onclick="window.helpNINJA.open()">Chat with Support</button>
```

### Page Context

Pass page context to improve AI responses:

```javascript
window.helpNINJAConfig = {
  // ... other config
  pageContext: {
    title: document.title,
    url: window.location.href,
    section: "pricing" // custom section identifier
  }
};
```

## Security Considerations

The helpNINJA widget uses domain verification to ensure it only runs on authorized websites. For enhanced security:

1. Verify your domain in the helpNINJA dashboard
2. Use HTTPS for your website
3. Keep your Site ID and Script Key confidential
4. Regularly rotate your Script Key if needed

## Troubleshooting

If you're experiencing issues with the widget:

### Widget Not Loading

- Verify your domain is correctly set up in the helpNINJA dashboard
- Check that your tenant account is active
- Ensure the script is being loaded from the correct URL

### Chat Not Working

- Check browser console for any error messages
- Verify you have sufficient message credits in your plan
- Ensure you've added documents to your knowledge base

### Cross-Origin Issues

- If you're using a proxy or CDN, ensure it's not blocking CORS headers
- For local development, use a domain that matches your site configuration or contact support to add your local domain

### Styling Conflicts

- The widget uses isolated styling to prevent conflicts
- If you notice any visual issues, try adjusting the z-index of conflicting elements

## Support

Need help with your integration? Contact our support team:

- Email: support@helpninja.app
- Dashboard: Submit a ticket from your account
- Documentation: Visit our [knowledge base](https://helpninja.app/docs)

---

For more advanced customization options or enterprise integrations, please contact our sales team.
