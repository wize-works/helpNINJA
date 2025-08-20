# Widget Integration Update

## Overview

To improve the user experience for installing and configuring the helpNINJA widget across different frameworks and environments, we've enhanced the widget system with site-specific configurations, CORS support, and improved installation options.

## Key Changes

### 1. Site-Specific Widget Configuration

We've implemented a new system that allows multi-site tenants to customize the widget appearance and behavior for each of their websites individually:

- Created a new `widget_configurations` database table to store site-specific settings
- Developed API endpoints at `/api/sites/[id]/widget-config` for managing configurations
- Built a user-friendly configuration modal accessible from the site manager
- Implemented tabs for Appearance, Behavior, and Content settings

### 2. Cross-Origin Resource Sharing (CORS) Support

To ensure the widget works seamlessly across different domains:

- Added CORS headers to all widget-related API endpoints
- Created a reusable `withCORS` utility function in `lib/cors.ts`
- Implemented OPTIONS handlers for CORS preflight requests
- Ensured secure cross-domain communication for all widget functionality

### 3. Multi-Framework Integration Options

We've created a new component `IntegrationOptions` that provides code snippets for integrating the helpNINJA widget in various environments:

- Plain HTML
- Next.js
- React
- Vue.js
- Angular
- WordPress
- Direct Link (URL parameters)

### 4. Improved Documentation

We've updated the integration guide (`docs/widget-integration-guide.md`) that explains:

- How to implement the widget in various environments
- Available configuration options
- CORS considerations
- Site-specific configuration instructions
- Troubleshooting tips including CORS-related issues

## Technical Implementation

### Database Schema

Added a new table for widget configurations:

```sql
CREATE TABLE IF NOT EXISTS widget_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  primary_color VARCHAR(50) NOT NULL DEFAULT '#7C3AED',
  position VARCHAR(50) NOT NULL DEFAULT 'bottom-right',
  welcome_message TEXT NOT NULL DEFAULT '👋 Hi there! How can I help you today?',
  ai_name VARCHAR(100) DEFAULT 'AI Assistant',
  show_branding BOOLEAN DEFAULT TRUE,
  auto_open_delay INTEGER DEFAULT 0,
  button_icon VARCHAR(50) DEFAULT 'default',
  custom_icon_url TEXT,
  theme VARCHAR(50) DEFAULT 'auto',
  font_family VARCHAR(100),
  voice VARCHAR(50) DEFAULT 'friendly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### CORS Implementation

```typescript
// lib/cors.ts
export function withCORS(res: Response) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
}
```

## Benefits

- **Multi-Site Support**: Each site can have its own unique widget configuration
- **Framework Flexibility**: Users can install the widget in their preferred framework
- **Better Developer Experience**: Clear instructions and improved cross-domain support
- **Reduced Support Burden**: More detailed configuration options and documentation
- **Enhanced Customization**: More control over widget appearance and behavior
- **Improved Cross-Domain Support**: Robust CORS implementation ensures the widget works on any domain

## Future Improvements

1. Create framework-specific npm packages (e.g., `@helpninja/react`, `@helpninja/vue`, etc.)
2. Add support for custom CSS for advanced widget styling
3. Implement A/B testing features for widget configurations
4. Create an analytics dashboard for widget performance by site
5. Add real-time widget preview in the configuration modal
6. Add more integration options for mobile apps and other platforms

## Testing Suggestions

- Test the widget integration in each supported framework
- Verify that the code snippets work correctly
- Test with domain verification to ensure proper security checks
- Verify CORS headers on all widget-related API endpoints
- Test configuration changes and verify they apply correctly to the widget
- Test in development and production environments
