# Adding the Chat Widget to Your Website

Getting your helpNINJA chat widget live on your website is quick and easy. This guide walks you through the installation process for different website types and platforms.

## Quick Installation Overview

### What You'll Need
- **Admin access** to your website
- **Your widget code** (available in your helpNINJA dashboard)
- **5-10 minutes** for installation and testing

### Installation Process Summary
1. Get your unique widget code from helpNINJA
2. Add the code to your website
3. Test the widget functionality
4. Customize appearance and behavior
5. Monitor performance and optimize

## Getting Your Widget Code

### Accessing Your Widget Code
1. **Log in** to your helpNINJA dashboard
2. Go to **Widget Setup > Installation**
3. You'll see your unique widget code
4. **Copy the code** - it looks like this:

```html
<script>
  window.helpNinjaConfig = {
    tenantId: 'your-unique-tenant-id',
    apiUrl: 'https://api.helpninja.com'
  };
</script>
<script async src="https://widget.helpninja.com/widget.js"></script>
```

### Understanding the Code
**The widget code contains:**
- **Your Tenant ID** - Unique identifier for your account
- **API Configuration** - Connection settings for the helpNINJA service
- **Widget Script** - The JavaScript that creates the chat interface
- **Async Loading** - Won't slow down your website loading

**Important Notes:**
- **Each account has a unique code** - Don't use someone else's code
- **Safe to use** - The code only adds chat functionality
- **Lightweight** - Minimal impact on website performance
- **Secure** - All communication is encrypted

## Installation Methods

### Method 1: Universal Installation (Recommended)
**Works for most websites - add to your site's header or footer**

**Step-by-Step Instructions:**
1. **Copy your widget code** from the helpNINJA dashboard
2. **Access your website's HTML**
   - If using a website builder, look for "Custom Code" or "HTML" sections
   - If using WordPress, add to your theme's `functions.php` or use a plugin
   - If coding directly, add to your HTML template
3. **Paste the code** before the closing `</body>` tag (preferred) or in the `<head>` section
4. **Save changes** and publish your website
5. **Test the widget** by visiting your website

**Example Placement:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Website</title>
</head>
<body>
    <!-- Your website content -->
    
    <!-- helpNINJA Widget Code - Add before closing body tag -->
    <script>
      window.helpNinjaConfig = {
        tenantId: 'your-unique-tenant-id',
        apiUrl: 'https://api.helpninja.com'
      };
    </script>
    <script async src="https://widget.helpninja.com/widget.js"></script>
</body>
</html>
```

### Method 2: Platform-Specific Installation

#### WordPress
**Option A: Using a Plugin (Easiest)**
1. Install the "Insert Headers and Footers" plugin
2. Go to **Settings > Insert Headers and Footers**
3. Paste your widget code in the "Scripts in Footer" section
4. Click **Save**

**Option B: Theme Files (Advanced)**
1. Access your WordPress admin dashboard
2. Go to **Appearance > Theme Editor**
3. Select **footer.php** or **header.php**
4. Paste your widget code before the closing `</body>` tag
5. Click **Update File**

**Option C: Child Theme (Recommended for Custom Themes)**
1. Create or access your child theme's `functions.php` file
2. Add this code:
```php
function add_helpninja_widget() {
    ?>
    <script>
      window.helpNinjaConfig = {
        tenantId: 'your-unique-tenant-id',
        apiUrl: 'https://api.helpninja.com'
      };
    </script>
    <script async src="https://widget.helpninja.com/widget.js"></script>
    <?php
}
add_action('wp_footer', 'add_helpninja_widget');
```

#### Shopify
1. **Go to Online Store > Themes**
2. **Click Actions > Edit Code** for your active theme
3. **Find theme.liquid** in the Layout folder
4. **Paste your widget code** before the closing `</body>` tag
5. **Save the file**

#### Wix
1. **Go to Settings > Tracking & Analytics**
2. **Click "+ New Tool"**
3. **Select "Custom" from the dropdown**
4. **Paste your widget code** in the code box
5. **Set to load on "All Pages"**
6. **Apply and publish changes**

#### Squarespace
1. **Go to Settings > Advanced > Code Injection**
2. **Paste your widget code** in the "Footer" section
3. **Save changes**
4. **Your site will update automatically**

#### Webflow
1. **Go to Project Settings > Custom Code**
2. **Paste your widget code** in the "Footer Code" section
3. **Save changes and republish your site**

#### React/Next.js Applications
**For React Applications:**
```javascript
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    window.helpNinjaConfig = {
      tenantId: 'your-unique-tenant-id',
      apiUrl: 'https://api.helpninja.com'
    };
    
    const script = document.createElement('script');
    script.src = 'https://widget.helpninja.com/widget.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  );
}
```

#### Angular Applications
**Add to your index.html:**
```html
<!-- Add to the end of body tag in src/index.html -->
<script>
  window.helpNinjaConfig = {
    tenantId: 'your-unique-tenant-id',
    apiUrl: 'https://api.helpninja.com'
  };
</script>
<script async src="https://widget.helpninja.com/widget.js"></script>
```

## Testing Your Installation

### Verifying the Widget is Working
1. **Visit your website** in a new browser window
2. **Look for the chat widget** - usually appears as a small bubble in the bottom right corner
3. **Click the widget** to open the chat interface
4. **Send a test message** - try asking a simple question
5. **Verify you get a response** - the AI should respond based on your knowledge base

### Testing Checklist
- [ ] **Widget appears** on your website
- [ ] **Widget opens** when clicked
- [ ] **Chat interface loads** properly
- [ ] **Messages can be sent** and received
- [ ] **Widget matches your branding** (if customized)
- [ ] **Widget works on mobile** devices
- [ ] **Widget doesn't interfere** with other site functionality

### Common Issues and Solutions
**Widget Doesn't Appear:**
- Check that the code is properly pasted
- Ensure your website changes have been published
- Try clearing your browser cache
- Check browser console for JavaScript errors

**Widget Appears But Doesn't Work:**
- Verify your tenant ID is correct
- Check your internet connection
- Try testing from a different browser or device
- Contact support if issues persist

**Widget Interferes with Site Design:**
- Adjust widget positioning in your helpNINJA dashboard
- Customize widget appearance to better match your site
- Consider adjusting your website's CSS if necessary

## Multiple Website Installation

### Installing on Multiple Sites
**If Your Plan Includes Multiple Websites:**
1. **Use the same widget code** on all your websites
2. **Track performance separately** in your helpNINJA analytics
3. **Customize appearance** per website if needed
4. **Monitor all sites** from one dashboard

**Managing Multiple Sites:**
- **Site Identification** - Analytics will show which site conversations come from
- **Separate Customization** - Different sites can have different widget appearances
- **Unified Management** - All conversations managed from one helpNINJA account
- **Consistent Knowledge Base** - Same AI knowledge base serves all sites (unless customized)

### Site-Specific Customization
**Advanced Configuration for Different Sites:**
```javascript
window.helpNinjaConfig = {
  tenantId: 'your-unique-tenant-id',
  apiUrl: 'https://api.helpninja.com',
  siteId: 'website-identifier', // Optional: for site-specific tracking
  customization: {
    theme: 'light', // or 'dark'
    primaryColor: '#007bff',
    position: 'bottom-right' // bottom-left, bottom-right, etc.
  }
};
```

## Advanced Installation Options

### Custom Positioning
**Control Where the Widget Appears:**
```javascript
window.helpNinjaConfig = {
  tenantId: 'your-unique-tenant-id',
  apiUrl: 'https://api.helpninja.com',
  position: 'bottom-left', // bottom-right (default), bottom-left, top-right, top-left
  offset: {
    x: 20, // horizontal offset in pixels
    y: 20  // vertical offset in pixels
  }
};
```

### Conditional Loading
**Show Widget Only on Certain Pages:**
```javascript
// Only load on specific pages
if (window.location.pathname.includes('/support/') || 
    window.location.pathname.includes('/contact/')) {
  window.helpNinjaConfig = {
    tenantId: 'your-unique-tenant-id',
    apiUrl: 'https://api.helpninja.com'
  };
  
  const script = document.createElement('script');
  script.src = 'https://widget.helpninja.com/widget.js';
  script.async = true;
  document.body.appendChild(script);
}
```

### Delayed Loading
**Load Widget After Page Content:**
```javascript
window.addEventListener('load', function() {
  // Wait 2 seconds after page load
  setTimeout(function() {
    window.helpNinjaConfig = {
      tenantId: 'your-unique-tenant-id',
      apiUrl: 'https://api.helpninja.com'
    };
    
    const script = document.createElement('script');
    script.src = 'https://widget.helpninja.com/widget.js';
    script.async = true;
    document.body.appendChild(script);
  }, 2000);
});
```

## Security Considerations

### Website Security
**The helpNINJA Widget is Safe:**
- **No sensitive data access** - Widget only adds chat functionality
- **Encrypted communication** - All messages encrypted in transit
- **No data collection** - Widget doesn't collect personal information without consent
- **Industry-standard security** - Follows web security best practices

### Content Security Policy (CSP)
**If Your Site Uses CSP, Add These Directives:**
```
script-src 'unsafe-inline' https://widget.helpninja.com;
connect-src https://api.helpninja.com wss://api.helpninja.com;
frame-src https://widget.helpninja.com;
```

## Performance Impact

### Widget Performance
**Minimal Impact on Your Website:**
- **Lightweight Code** - Less than 50KB total
- **Async Loading** - Won't block page rendering
- **CDN Delivery** - Fast loading from global content delivery network
- **Lazy Loading** - Chat interface loads only when needed

### Optimization Tips
**Ensuring Best Performance:**
- **Place code before `</body>`** - Allows page to load first
- **Use async loading** - Prevents blocking page rendering
- **Monitor site speed** - Check that widget doesn't impact load times
- **Consider conditional loading** - Load only where needed

## Troubleshooting Installation

### Common Problems
**Widget Code Issues:**
- **Incorrect Tenant ID** - Double-check your unique identifier
- **Code Placement** - Ensure code is in the right location
- **Syntax Errors** - Make sure code is copied exactly as provided
- **Cache Issues** - Clear browser and website caches

**Platform-Specific Issues:**
- **WordPress Plugin Conflicts** - Try disabling other plugins temporarily
- **Shopify Theme Updates** - Code may be lost during theme updates
- **Website Builder Limitations** - Some builders have restrictions on custom code

### Getting Help
**If You Need Installation Support:**
- **Email Support** - installation@helpninja.com
- **Live Chat** - Available on helpninja.com during business hours
- **Video Call Support** - Available for Professional and Enterprise customers
- **Installation Service** - We can install the widget for you (Enterprise customers)

**Before Contacting Support:**
- **Website URL** - Where you're trying to install the widget
- **Platform Details** - WordPress, Shopify, custom HTML, etc.
- **Error Messages** - Any error messages you're seeing
- **Browser Information** - Which browser you're using for testing

---

**Installation complete?** Great! Next, learn how to [customize your widget appearance](customizing-widget-appearance.md) or [test your widget functionality](testing-your-widget.md) to ensure everything is working perfectly.

**Need installation help?** Contact our support team at installation@helpninja.com or use the live chat on helpninja.com. We're here to get your widget up and running quickly!
