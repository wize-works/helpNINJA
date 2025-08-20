# Setting up the helpNINJA Widget in Different Environments

This guide provides instructions for installing and configuring the helpNINJA chat widget in various web environments.

## Table of Contents
- [Basic HTML Website](#basic-html-website)
- [Next.js Applications](#nextjs-applications)
- [React Applications](#react-applications)
- [Vue.js Applications](#vuejs-applications)
- [Angular Applications](#angular-applications)
- [WordPress Sites](#wordpress-sites)
- [Direct Link Integration](#direct-link-integration)
- [Widget Configuration Options](#widget-configuration-options)
- [Widget Features](#widget-features)
- [Cross-Origin Resource Sharing (CORS)](#cross-origin-resource-sharing-cors)
- [Site-Specific Configuration](#site-specific-configuration)
- [Troubleshooting](#troubleshooting)

## Basic HTML Website

Add this script just before the closing `</body>` tag in your HTML:

```html
<!-- helpNINJA Chat Widget -->
<script>
  (function() {
    window.helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      verificationToken: "YOUR_SITE_VERIFICATION_TOKEN", // Use verification_token, not script_key
      voice: "friendly"
    };
    var script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget";
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

## Next.js Applications

For Next.js applications, we recommend using the `next/script` component for proper script loading:

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
                verificationToken: "YOUR_SITE_VERIFICATION_TOKEN", // Use verification_token, not script_key
                voice: "friendly"
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

### Alternative App Router Approach

If you're using the App Router, you can create a client component:

```jsx
'use client';

import { useEffect } from 'react';

export default function HelpNinjaWidget() {
  useEffect(() => {
    window.helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      verificationToken: "YOUR_SITE_VERIFICATION_TOKEN", // Use verification_token, not script_key
      voice: "friendly"
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

Then import and use this component in your layout:

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

## React Applications

For React applications:

```jsx
import { useEffect } from 'react';

function HelpNinjaWidget() {
  useEffect(() => {
    // Set configuration
    window.helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      verificationToken: "YOUR_SITE_VERIFICATION_TOKEN", // Use verification_token, not script_key
      voice: "friendly"
    };

    // Create and load script
    const script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Optional: Remove script on unmount
      const existingScript = document.querySelector('script[src="https://helpninja.app/api/widget"]');
      if (existingScript) document.head.removeChild(existingScript);
    };
  }, []);

  return null;
}

// Use in your app component:
// <HelpNinjaWidget />
```

## Vue.js Applications

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
      verificationToken: "YOUR_SITE_VERIFICATION_TOKEN", // Use verification_token, not script_key
      voice: "friendly"
    };

    // Create and load script
    const script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget";
    script.async = true;
    document.head.appendChild(script);
  }
}
</script>
```

## Angular Applications

For Angular applications:

```typescript
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  ngOnInit() {
    // Set configuration
    (window as any).helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      verificationToken: "YOUR_SITE_VERIFICATION_TOKEN", // Use verification_token, not script_key
      voice: "friendly"
    };

    // Create and load script
    const script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget";
    script.async = true;
    document.head.appendChild(script);
  }
}
```

## WordPress Sites

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
          verificationToken: "<?php echo 'YOUR_SITE_VERIFICATION_TOKEN'; ?>", // Use verification_token, not script_key
          voice: "<?php echo 'friendly'; ?>"
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

## Direct Link Integration

For the simplest integration method, use this direct script tag:

```html
<script async src="https://helpninja.app/api/widget?t=YOUR_TENANT_PUBLIC_KEY&s=YOUR_SITE_ID&k=YOUR_SITE_VERIFICATION_TOKEN&voice=friendly"></script>
```

> **Important**: The `k` parameter requires your site's **verification token**, not the script key. This is the token generated during site verification.

## Widget Configuration Options

The widget can be customized with the following configuration options:

| Option | Description | Default Value |
|--------|-------------|---------------|
| primaryColor | Main color for the widget | "#7C3AED" |
| position | Position on the screen | "bottom-right" |
| welcomeMessage | Initial message shown to users | "👋 Hi there! How can I help you today?" |
| aiName | Name of the AI assistant | "AI Assistant" |
| showBranding | Whether to show helpNINJA branding | true |
| autoOpenDelay | Delay in ms before auto-opening (0 = disabled) | 0 |
| buttonIcon | Icon style for chat button | "default" |
| theme | Widget color theme | "auto" |
| voice | AI voice style | "friendly" |

These settings can be managed in the helpNINJA dashboard on a site-by-site basis.

## Cross-Origin Resource Sharing (CORS)

The helpNINJA widget uses CORS-enabled endpoints to support cross-domain API calls. All widget-related API endpoints have been configured with CORS headers to allow the widget to function properly on any domain. The key endpoints with CORS support include:

- `/api/widget` - The main widget script loader
- `/api/chat` - The API endpoint for sending/receiving chat messages
- `/api/escalate` - The endpoint for chat escalations
- `/api/sites/[id]/widget-config` - The endpoint for site-specific widget configuration

This ensures the widget works seamlessly across different domains without security restrictions.

## Site-Specific Configuration

Each site registered in helpNINJA can now have its own unique widget configuration. This allows multi-site tenants to customize the widget appearance and behavior for each of their websites individually.

### How to Configure

1. Navigate to the **Sites** section in your helpNINJA dashboard
2. Select a site from the list
3. Click the **Configure Widget** button
4. Customize the widget settings in the configuration modal
5. Save your changes

### Available Configuration Options

The site-specific widget configuration includes tabs for:

#### Appearance
- Primary Color
- Theme (Light, Dark, Auto)
- Button Position (Bottom Right, Bottom Left, etc.)
- Font Family
- Custom Button Icon

#### Behavior
- Auto-open Delay
- Show/Hide Branding

#### Content
- Welcome Message
- AI Name
- Voice Style

Changes to the configuration now feature a real-time preview, allowing you to see how your widget will look and behave as you make adjustments. This interactive preview shows both the chat bubble and the expanded chat interface with your chosen settings applied instantly. The configuration is saved when you click the "Save Configuration" button and will be applied to the widget on your site.

## Verification Token vs Script Key

> **Important**: The widget API uses the `verification_token` for site authentication, not the `script_key`.

When integrating the helpNINJA widget, always use:
- The **verification token** with the `k` parameter in direct script tags
- The **verification token** as the `verificationToken` property in the configuration object

The `verification_token` is generated during the site verification process and is used to validate that the widget is being loaded from the correct domain. This is different from the `script_key`, which is used for other internal purposes.

You can find your site's verification token in the helpNINJA dashboard under Sites > [Your Site] > Details.

## Troubleshooting

If you're experiencing issues with the widget:

1. **Check the browser console** for any error messages
2. **Verify domain verification** in your helpNINJA dashboard
3. **Ensure parameters are correct** - tenant ID, site ID, and verification token should match your dashboard values
4. **Check referer headers** - make sure the domain matches the registered domain in helpNINJA
5. **Try the direct link method** if you're having issues with the configuration object
6. **Verify CORS settings** - If you're using a proxy or CDN, ensure it doesn't block CORS headers

### Common Issues

#### Widget Not Loading
- Check that the domain is properly verified
- Ensure the script is being loaded from the correct helpNINJA instance
- Verify that the tenant is active and not suspended

#### Widget Loads But Chat Doesn't Work
- Check browser console for API errors
- Verify that your plan has sufficient message credits
- Ensure the site is properly configured with documents for RAG

#### CORS-Related Issues
- If you see errors like "Access to fetch at '...' from origin '...' has been blocked by CORS policy", check that your proxy or CDN is not stripping CORS headers
- For local development, ensure your development server is configured to handle CORS correctly
- Try using the direct link integration method which might bypass some CORS issues

For further assistance, contact helpNINJA support.

## Widget Features

### Custom Logo

The helpNINJA chat widget uses your brand's logo in both the chat bubble and the header of the chat panel. The logo is automatically applied with a clean, professional design that maintains your brand identity.

![helpNINJA Widget with Logo](/images/widget-preview.png)

The widget includes interactive features:
- Animated hover effects on the chat bubble
- Smooth transitions when opening and closing
- Responsive design that works on all screen sizes
- Custom AI voice options (friendly, professional, casual, formal)

No additional configuration is needed to enable the logo - it's automatically included when you add the widget to your site.
