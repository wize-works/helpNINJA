# Widget Styling Guide

This document explains how to customize the appearance of the helpNINJA chat widget embedded in your website.

## Basic Integration

The widget is added to your website using a script tag that points to your tenant's widget API:

```html
<script src="https://yourdomain.com/api/widget?t=YOUR_TENANT_KEY&s=YOUR_SITE_ID&k=VERIFICATION_TOKEN"></script>
```

## Customization Options

You can customize the widget's appearance by adding a configuration object to your page before loading the widget script:

```html
<script>
window.helpNINJAConfig = {
  // Core functionality
  tenantId: 'your-tenant-id', // Optional: normally pulled from script URL
  voice: 'friendly',          // Optional: 'friendly', 'professional', 'technical'
  
  // Color customization
  bubbleBackground: '#111',   // Chat bubble background color
  bubbleColor: '#fff',        // Chat bubble text/icon color
  panelBackground: '#fff',    // Main chat panel background
  panelHeaderBackground: '#f8fafc', // Header bar background
  messagesBackground: '#f8fafc', // Messages area background
  userBubbleBackground: '#3b82f6', // User message bubble background
  userBubbleColor: '#fff',    // User message text color
  assistantBubbleBackground: '#e5e7eb', // AI response bubble background
  assistantBubbleColor: '#111', // AI response text color
  buttonBackground: '#111',   // Send button background
  buttonColor: '#fff'         // Send button text color
};
</script>
<script src="https://yourdomain.com/api/widget?t=YOUR_TENANT_KEY&s=YOUR_SITE_ID&k=VERIFICATION_TOKEN"></script>
```

## Default Theme

If no custom colors are provided, the widget uses these default colors:

| Element | Background | Text |
|---------|------------|------|
| Chat Bubble | `#111` (dark gray) | `#fff` (white) |
| Chat Panel | `#fff` (white) | - |
| Panel Header | `#f8fafc` (light gray) | - |
| Messages Area | `#f8fafc` (light gray) | - |
| User Messages | `#3b82f6` (blue) | `#fff` (white) |
| Assistant Messages | `#e5e7eb` (light gray) | `#111` (dark gray) |
| Send Button | `#111` (dark gray) | `#fff` (white) |

## Example: Dark Theme

To create a dark-themed widget:

```html
<script>
window.helpNINJAConfig = {
  bubbleBackground: '#3b82f6',  // Blue bubble
  bubbleColor: '#ffffff',       // White icon
  panelBackground: '#1f2937',   // Dark panel
  panelHeaderBackground: '#111827', // Darker header
  messagesBackground: '#1f2937',// Dark messages area
  userBubbleBackground: '#3b82f6', // Blue user messages
  userBubbleColor: '#ffffff',   // White text for user
  assistantBubbleBackground: '#374151', // Dark gray AI messages
  assistantBubbleColor: '#ffffff', // White text for AI
  buttonBackground: '#3b82f6',  // Blue button
  buttonColor: '#ffffff'        // White button text
};
</script>
```

## Example: Brand-Aligned Theme

Here's how to match your brand colors (example for a company with green branding):

```html
<script>
window.helpNINJAConfig = {
  bubbleBackground: '#10b981', // Green bubble
  bubbleColor: '#ffffff',      // White icon
  panelBackground: '#ffffff',  // White panel
  panelHeaderBackground: '#f0fdf4', // Light green header
  messagesBackground: '#f0fdf4', // Light green messages area
  userBubbleBackground: '#10b981', // Green user messages
  userBubbleColor: '#ffffff',  // White text for user
  assistantBubbleBackground: '#ecfdf5', // Very light green AI messages 
  assistantBubbleColor: '#065f46', // Dark green text for AI
  buttonBackground: '#10b981', // Green button
  buttonColor: '#ffffff'       // White button text
};
</script>
```

## Responsive Design

The widget is designed to be responsive by default:
- Floating chat bubble: Fixed in the bottom right corner
- Chat panel: 360px width, maximum 70% of viewport height
- On mobile devices: Properly sized and positioned for smaller screens

## Accessibility Considerations

When choosing colors, consider accessibility guidelines:
- Maintain sufficient contrast ratios between text and background colors
- Avoid color combinations that might be difficult for colorblind users
- Test your configuration with accessibility tools

For further customization options or help with implementation, please contact support.
