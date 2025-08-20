# Widget Configuration Restructuring Implementation

## Overview

This document outlines the implementation of moving widget configuration from the general settings page to a site-specific approach. The new architecture supports multiple sites with individual widget configurations, providing a more scalable solution.

## Components Created

1. **Widget Configuration Component** (`src/components/widget-configuration.tsx`)
   - Core component containing all customization options
   - Supports being used both in settings page and in a modal
   - Provides live preview of widget appearance
   - Organized with tabs for appearance, behavior, and content

2. **Widget Configuration Modal** (`src/components/widget-config-modal.tsx`)
   - Modal wrapper for the widget configuration component
   - Uses Headless UI for accessibility
   - Allows configuration directly from the site management page

3. **Default Widget Configuration** (`src/components/default-widget-configuration.tsx`)
   - Used in the settings page
   - Shows site selector when multiple sites exist
   - Wraps the core widget configuration component

4. **API Routes**
   - `/api/sites/[id]/widget-config` for fetching and saving site-specific configuration

## Database Changes

Added a new `widget_configurations` table with the following structure:

```sql
CREATE TABLE IF NOT EXISTS widget_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    primary_color VARCHAR(20) NOT NULL DEFAULT '#7C3AED',
    position VARCHAR(20) NOT NULL DEFAULT 'bottom-right',
    welcome_message TEXT NOT NULL DEFAULT '👋 Hi there! How can I help you today?',
    ai_name VARCHAR(100) DEFAULT 'AI Assistant',
    show_branding BOOLEAN DEFAULT TRUE,
    auto_open_delay INTEGER DEFAULT 0,
    button_icon VARCHAR(20) DEFAULT 'default',
    custom_icon_url TEXT,
    theme VARCHAR(10) DEFAULT 'auto',
    font_family VARCHAR(100),
    voice VARCHAR(20) NOT NULL DEFAULT 'friendly',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT widget_config_site_unique UNIQUE (site_id)
);
```

The migration script is located at `src/sql/015_widget_configurations.sql`.

## UI Updates

1. **Site Manager** (`src/components/site-manager.tsx`)
   - Added a "Configure" button alongside the "Setup" button for verified sites
   - Integrated the widget configuration modal
   - Improved button layout in the site cards

2. **Settings Page** (to be implemented)
   - Will use `DefaultWidgetConfiguration` component
   - Will replace the existing widget configuration section

## Configuration Options

The widget configuration includes the following options:

### Appearance
- Primary Color (brand color for the widget)
- Position (bottom-right, bottom-left, top-right, top-left)
- Button Icon (default/logo, chat, help, message)
- Theme (light, dark, auto)

### Behavior
- Auto-Open Delay (in milliseconds, 0 to disable)
- Show Branding (toggle for "Powered by helpNINJA")
- AI Voice (personality/tone of the AI: friendly, professional, casual, formal)

### Content
- Welcome Message (initial greeting when chat opens)
- AI Name (name displayed for the assistant)

## Next Steps

1. Update `src/app/dashboard/settings/page.tsx` to use the new `DefaultWidgetConfiguration` component
2. Update the widget API route (`src/app/api/widget/route.ts`) to fetch and apply site-specific configurations
3. Fix TypeScript errors in the components
4. Add validation for widget configuration fields
5. Consider adding additional configuration options in the future:
   - Custom CSS
   - Chat window size
   - Custom header/footer
   - Pre-defined conversation starters

## Migration Plan

For existing users with widget configurations in the old format:
1. Create a migration script that copies existing widget settings to the new table
2. Create default configurations for all existing verified sites
3. Update widget API to support both old and new configuration formats during the transition

## Technical Debt and Improvements

1. Add proper TypeScript typing to components
2. Implement form validation
3. Add error handling for API calls
4. Consider using React Query for better data fetching
5. Add unit tests for the widget configuration components
6. Create a dedicated widget preview component that can be reused
