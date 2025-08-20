---
title: "Customizing Your helpNINJA Widget"
description: "Learn how to customize the appearance and behavior of your helpNINJA AI chat widget to match your brand and optimize the user experience."
slug: "/help/widget-customization"
date: "2025-08-19"
lastUpdated: "2025-08-19"
author: "helpNINJA Team"
authorAvatar: "/images/avatar-ninja.png"
category: "Configuration Guides"
tags: ["widget", "customization", "branding", "configuration", "appearance", "themes"]
---

# Customizing Your helpNINJA Widget

The helpNINJA chat widget is designed to be highly customizable, allowing you to create a seamless experience that matches your brand identity and meets your specific needs. This guide covers all the ways you can customize your widget's appearance and behavior.

![Widget Customization Overview](/images/widget-customization-overview.png)

## Customization Methods

You can customize your widget in two ways:

1. **Dashboard Configuration**: The easiest method, using our visual configuration interface
2. **Code Configuration**: For advanced users who want to set options programmatically

## Dashboard Configuration

### Accessing the Widget Configuration

1. Log in to your helpNINJA dashboard
2. Navigate to **Sites** in the left sidebar
3. Find the site you want to customize
4. Click the **Configure Widget** button

![Widget Configuration Button](/images/widget-config-button.png)

### Customization Tabs

The configuration modal has three main tabs:

#### Appearance Tab

Control the visual aspects of your widget:

- **Primary Color**: Choose a color that matches your brand
- **Theme**: Select Light, Dark, or Auto (follows user's system preference)
- **Position**: Place the widget in any corner of the screen
- **Font Family**: Match your website's typography
- **Button Icon**: Choose from preset icons or upload your own

![Appearance Tab](/images/widget-appearance-tab.png)

#### Behavior Tab

Control how the widget interacts with your users:

- **Auto-open Delay**: Set a delay (in milliseconds) before the widget opens automatically (0 = disabled)
- **Show Branding**: Toggle helpNINJA branding on/off
- **Persistence**: Control whether chat history persists between page loads

![Behavior Tab](/images/widget-behavior-tab.png)

#### Content Tab

Customize the messaging and voice of your AI assistant:

- **Welcome Message**: Set the initial message users see when opening the widget
- **AI Name**: Give your AI assistant a custom name
- **Voice Style**: Choose from different AI personality styles (friendly, professional, casual, formal)

![Content Tab](/images/widget-content-tab.png)

### Live Preview

As you make changes in the configuration interface, you'll see a live preview of your widget. This helps you visualize how your customizations will look to your users before saving.

## Code Configuration

For developers who prefer to set options programmatically, you can configure the widget through the `helpNINJAConfig` object:

```javascript
window.helpNINJAConfig = {
  // Required authentication parameters
  tenantId: "YOUR_TENANT_PUBLIC_KEY",
  siteId: "YOUR_SITE_ID",
  scriptKey: "YOUR_SITE_SCRIPT_KEY",
  
  // Appearance
  primaryColor: "#2563EB",
  theme: "light", // "light", "dark", or "auto"
  position: "bottom-left", // "bottom-right", "bottom-left", "top-right", "top-left"
  fontFamily: "'Poppins', sans-serif",
  buttonIcon: "default", // "default", "chat", "message", "question", "custom"
  customIconUrl: "https://yourdomain.com/custom-icon.svg", // Used when buttonIcon is "custom"
  
  // Behavior
  autoOpenDelay: 3000, // milliseconds, 0 = disabled
  showBranding: false,
  
  // Content
  welcomeMessage: "Hello! How may I assist you today?",
  aiName: "Support Assistant",
  voice: "professional" // "friendly", "professional", "casual", "formal"
};
```

## Advanced Customization Examples

### Custom Position and Color

```javascript
window.helpNINJAConfig = {
  // ... required parameters
  primaryColor: "#F59E0B", // Amber
  position: "bottom-left",
  theme: "dark"
};
```

### Auto-opening Widget with Custom Message

```javascript
window.helpNINJAConfig = {
  // ... required parameters
  autoOpenDelay: 5000, // Opens after 5 seconds
  welcomeMessage: "👋 Welcome to our site! Need help finding anything?"
};
```

### Professional Voice with Custom Name

```javascript
window.helpNINJAConfig = {
  // ... required parameters
  aiName: "TechSupport AI",
  voice: "professional"
};
```

## Multi-Site Customization

If you manage multiple websites under a single helpNINJA account, you can customize the widget differently for each site:

1. Each site has its own unique configuration stored in the helpNINJA system
2. Configurations are applied automatically based on the Site ID used in the widget script
3. Changes made in the dashboard take effect immediately across all instances of the widget

This allows you to maintain consistent branding within each website while managing everything from a single helpNINJA dashboard.

## Mobile Responsiveness

The helpNINJA widget is fully responsive and adapts automatically to mobile devices:

- On small screens, the widget expands to a more comfortable reading size
- Touch-friendly interface elements for mobile users
- Responsive positioning that avoids covering important content
- Automatically adjusts to portrait and landscape orientations

No additional configuration is needed to support mobile devices.

## Customization Best Practices

### Brand Alignment

- Use your primary brand color for the widget
- Select a theme that complements your website design
- Consider setting a custom AI name that reflects your brand voice

### User Experience

- Position the widget where it won't interfere with important content
- Use auto-open sparingly to avoid annoying users
- Craft a welcome message that clearly explains how the assistant can help

### Performance

- If using a custom icon, optimize the image file size
- Consider setting `showBranding: false` for a cleaner look
- Test the widget on both desktop and mobile devices

## Theme Examples

### E-commerce Theme

```javascript
window.helpNINJAConfig = {
  // ... required parameters
  primaryColor: "#10B981", // Green
  welcomeMessage: "Looking for a specific product? I can help you find it!",
  aiName: "Shopping Assistant",
  theme: "light",
  position: "bottom-right"
};
```

### SaaS Theme

```javascript
window.helpNINJAConfig = {
  // ... required parameters
  primaryColor: "#6366F1", // Indigo
  welcomeMessage: "Need help with our platform? Ask me anything!",
  aiName: "Product Support",
  theme: "auto",
  voice: "professional"
};
```

### Finance Theme

```javascript
window.helpNINJAConfig = {
  // ... required parameters
  primaryColor: "#1E40AF", // Dark Blue
  welcomeMessage: "Have questions about your account or services? I'm here to assist.",
  aiName: "Financial Assistant",
  theme: "light",
  voice: "professional"
};
```

## Testing Your Customizations

After customizing your widget:

1. **Test on multiple browsers**: Chrome, Firefox, Safari, and Edge
2. **Check on mobile devices**: iOS and Android, in both portrait and landscape
3. **Verify dark mode**: If using the "auto" theme, test with system dark mode enabled
4. **Test interactions**: Make sure the chat experience flows well with your customizations

## Troubleshooting Customization Issues

### Color Not Applying

- Ensure you're using a valid hex color code (e.g., "#FF5500")
- Check that you've saved the configuration changes
- Clear your browser cache and reload the page

### Custom Icon Not Showing

- Verify the URL is accessible and doesn't have CORS restrictions
- Ensure the image is an appropriate format (SVG, PNG, or JPEG)
- Check that the image isn't too large (recommend under 100KB)

### Theme Issues

- If using "auto" theme, test in both light and dark system modes
- Check for contrast issues between text and background
- Ensure your primary color is visible against both light and dark backgrounds

## Need More Help?

If you need assistance with widget customization:

- Contact our support team at support@helpninja.app
- Schedule a consultation with our design team for personalized guidance
- Visit our [knowledge base](https://helpninja.app/docs) for more articles and tutorials

---

Ready to take your widget to the next level? Check out our [Advanced Widget Recipes](/help/widget-recipes) for creative implementations and use cases.
