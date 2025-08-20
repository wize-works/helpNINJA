---
title: "helpNINJA Widget Troubleshooting"
description: "Solutions to common issues when implementing or using the helpNINJA chat widget on your website or application."
slug: "/help/widget-troubleshooting"
date: "2025-08-19"
lastUpdated: "2025-08-19"
author: "helpNINJA Team"
authorAvatar: "/images/avatar-ninja.png"
category: "Troubleshooting"
tags: ["widget", "troubleshooting", "errors", "integration", "cors", "domain"]
---

# helpNINJA Widget Troubleshooting

Having trouble with your helpNINJA chat widget? This guide covers common issues and their solutions to get your widget working properly.

## Quick Checklist

Before diving into specific issues, check these common causes:

- ✓ Verify your tenant is active and has available message credits
- ✓ Confirm your domain is verified in the helpNINJA dashboard
- ✓ Check that you're using the correct Site ID and Script Key
- ✓ Ensure your website loads over HTTPS (for production sites)
- ✓ Look for JavaScript errors in your browser console (F12)

## Common Issues and Solutions

### Widget Doesn't Appear

**Possible Causes:**
1. Script isn't loading properly
2. Domain verification issue
3. JavaScript error preventing execution

**Solutions:**

1. **Check script placement**
   ```html
   <!-- Place just before the closing </body> tag -->
   <script async src="https://helpninja.app/api/widget?t=YOUR_TENANT_PUBLIC_KEY&s=YOUR_SITE_ID&k=YOUR_SITE_SCRIPT_KEY"></script>
   </body>
   ```

2. **Verify domain in dashboard**
   - Go to Sites section in your dashboard
   - Check that your domain is correctly listed and verified
   - For local development, add localhost or your dev domain to the allowed domains

3. **Check for JavaScript errors**
   - Open your browser's developer console (F12)
   - Look for any red error messages related to helpNINJA or the widget script
   - If you see errors, please contact our support team with screenshots

### Widget Loads But Chat Doesn't Work

**Possible Causes:**
1. API connection issues
2. CORS (Cross-Origin Resource Sharing) restrictions
3. Insufficient message credits

**Solutions:**

1. **Check API connectivity**
   - Verify your network allows connections to the helpNINJA API
   - Check for firewall or proxy restrictions

2. **CORS issues**
   - Ensure you're using the widget on a domain that matches your site configuration
   - If using a CDN or proxy, make sure it's not stripping CORS headers
   - For local testing, add your local domain to your site settings

3. **Message credits**
   - Verify you have sufficient message credits in your account
   - Check your usage dashboard for any limits reached

### Styling Issues

**Possible Causes:**
1. CSS conflicts with your website
2. Z-index issues causing overlay problems
3. Mobile responsiveness issues

**Solutions:**

1. **CSS conflicts**
   - The widget uses isolated styling, but conflicts can still occur
   - Check for any CSS on your site targeting global elements like `.chat` or `.modal`

2. **Z-index problems**
   - If the widget appears behind other elements, check their z-index values
   - The widget uses a high z-index (999999) but you may need to adjust other elements

3. **Mobile display issues**
   - Test on various mobile devices and screen sizes
   - Ensure your viewport meta tag is properly set:
     ```html
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     ```

### Authentication Errors

**Possible Causes:**
1. Incorrect API keys
2. Expired keys
3. Account suspension

**Solutions:**

1. **Verify credentials**
   - Double-check your Tenant Public Key, Site ID, and Script Key
   - Regenerate your Script Key if needed (remember to update all instances)

2. **Check account status**
   - Log in to your dashboard to verify your account is active
   - Check for any payment issues or account restrictions

### Integration-Specific Issues

#### React/Next.js Issues

**Problem:** Widget doesn't persist between page navigations

**Solution:**
```jsx
// Place the widget in a persistent layout component
// that doesn't unmount during navigation
import { useEffect } from 'react';

function WidgetLoader() {
  useEffect(() => {
    // Only load once
    if (window.helpNINJALoaded) return;
    window.helpNINJALoaded = true;
    
    window.helpNINJAConfig = {
      tenantId: "YOUR_TENANT_PUBLIC_KEY",
      siteId: "YOUR_SITE_ID",
      scriptKey: "YOUR_SITE_SCRIPT_KEY"
    };

    const script = document.createElement("script");
    script.src = "https://helpninja.app/api/widget";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
```

#### WordPress Issues

**Problem:** Widget conflicts with theme or plugins

**Solution:**
```php
// Use a higher priority to ensure the widget loads after other scripts
add_action('wp_footer', 'add_helpninja_widget', 100);

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
```

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| 401 | Authentication Failed | Check your API keys and tenant status |
| 403 | Forbidden - Domain not authorized | Verify domain in dashboard settings |
| 429 | Too Many Requests | You've reached your rate limit, upgrade your plan or wait |
| 500 | Server Error | Contact support with details of the issue |

## Testing Tools

Use these tools to diagnose widget issues:

1. **Widget Test Mode**
   ```javascript
   window.helpNINJAConfig = {
     // ...other config
     debug: true // Enables detailed logging
   };
   ```

2. **Connection Test**
   ```javascript
   // Run in browser console to test API connectivity
   fetch('https://helpninja.app/api/health')
     .then(response => response.json())
     .then(data => console.log('API Status:', data))
     .catch(err => console.error('Connection issue:', err));
   ```

3. **CORS Validator**
   ```javascript
   // Run in browser console to test CORS configuration
   fetch('https://helpninja.app/api/health', {
     method: 'OPTIONS',
     headers: {'Origin': window.location.origin}
   })
   .then(r => console.log('CORS Headers:', 
     Object.fromEntries(r.headers.entries())
   ));
   ```

## Local Development Tips

When developing locally:

1. **Add your local domain to allowed domains**
   - Go to Sites → Your Site → Edit
   - Add your local development URL (e.g., localhost:3000)

2. **Use debug mode**
   ```javascript
   window.helpNINJAConfig = {
     // ...other config
     debug: true
   };
   ```

3. **Use direct URL parameters for quick testing**
   ```html
   <script src="https://helpninja.app/api/widget?t=YOUR_TENANT_KEY&s=YOUR_SITE_ID&k=YOUR_SITE_KEY&debug=true"></script>
   ```

## Getting Support

If you're still experiencing issues:

1. **Gather Information**
   - Your tenant ID and site ID
   - Screenshots of any error messages
   - URL where the issue occurs
   - Browser and device information

2. **Contact Support**
   - Email: support@helpninja.app
   - In-dashboard: Click "Get Help" in the bottom left
   - Include all gathered information

3. **Check Status**
   - Visit our [status page](https://status.helpninja.app) to check for any ongoing service issues

---

We're committed to ensuring your widget works perfectly. If you need further assistance, don't hesitate to reach out to our support team.
