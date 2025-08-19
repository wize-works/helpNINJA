# Setting up the helpNINJA Widget in Different Environments

This guide provides instructions for installing the helpNINJA chat widget in various web environments.

## Table of Contents
- [Basic HTML Website](#basic-html-website)
- [Next.js Applications](#nextjs-applications)
- [React Applications](#react-applications)
- [Vue.js Applications](#vuejs-applications)
- [Angular Applications](#angular-applications)
- [WordPress Sites](#wordpress-sites)
- [Direct Link Integration](#direct-link-integration)
- [Widget Features](#widget-features)
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
      scriptKey: "YOUR_SITE_SCRIPT_KEY",
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
                scriptKey: "YOUR_SITE_SCRIPT_KEY",
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
      scriptKey: "YOUR_SITE_SCRIPT_KEY",
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
      scriptKey: "YOUR_SITE_SCRIPT_KEY",
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
      scriptKey: "YOUR_SITE_SCRIPT_KEY",
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
      scriptKey: "YOUR_SITE_SCRIPT_KEY",
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
          scriptKey: "<?php echo 'YOUR_SITE_SCRIPT_KEY'; ?>",
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
<script async src="https://helpninja.app/api/widget?t=YOUR_TENANT_PUBLIC_KEY&s=YOUR_SITE_ID&k=YOUR_SITE_SCRIPT_KEY&voice=friendly"></script>
```

## Troubleshooting

If you're experiencing issues with the widget:

1. **Check the browser console** for any error messages
2. **Verify domain verification** in your helpNINJA dashboard
3. **Ensure parameters are correct** - tenant ID, site ID, and script key should match your dashboard values
4. **Check referer headers** - make sure the domain matches the registered domain in helpNINJA
5. **Try the direct link method** if you're having issues with the configuration object

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
