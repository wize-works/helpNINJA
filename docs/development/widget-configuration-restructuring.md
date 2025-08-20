# Widget Configuration Restructuring Plan

## Background

The helpNINJA platform has evolved from supporting a single site widget to multiple sites. Currently, widget configuration is embedded within the general settings page (`/dashboard/settings`), which creates confusion about which site's widget is being configured. This document outlines the plan to restructure widget configuration to better support the multi-site architecture.

## Current State

- `/dashboard/settings` page contains both:
  - Tenant-wide settings (account, billing, etc.)
  - Widget configuration (applies globally or to a default site)
- Site management is handled in `/dashboard/sites`
- We've added a "Widget Setup" button to each site card, but it only provides embedding instructions, not configuration options

## Goals

1. Make the settings page truly about tenant settings
2. Move widget-specific configuration to site-specific contexts
3. Provide a clear separation between widget embedding and widget configuration
4. Maintain backward compatibility with existing implementations
5. Create a more intuitive user flow for managing multiple sites and their widgets

## Implementation Plan

### 1. Restructure Settings Page

- Keep `/dashboard/settings` focused on tenant-wide settings:
  - Account information
  - API keys
  - Billing/subscription management
  - Team management
  - Organization details
  - Global preferences
  - Theme/branding options

### 2. Create Site-Specific Widget Configuration

Two approaches will be implemented:

**A. Widget Configuration Modal**
- Add a "Configure Widget" button to each site card's actions in the site manager
- Clicking this opens a modal with widget configuration options
- Configuration saved to the specific site

**B. Widget Configuration API**
- Create API endpoints for per-site widget configuration:
  - `GET /api/sites/[siteId]/widget-config` - Get site-specific widget configuration
  - `POST /api/sites/[siteId]/widget-config` - Update site-specific widget configuration

### 3. Components to Create

1. `WidgetConfiguration` component:
   - Core component for widget configuration
   - Can be used in both modal and page contexts
   - Contains all widget customization options

2. `WidgetConfigurationModal` component:
   - Modal wrapper around the WidgetConfiguration component
   - Used when configuring from site cards

3. `WidgetConfigSchema` type:
   - Define the shape of widget configuration data
   - Ensure consistency across frontend and API

### 4. Database Changes

1. Create a new `widget_configurations` table:
   ```sql
   CREATE TABLE IF NOT EXISTS widget_configurations (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     site_id UUID NOT NULL REFERENCES tenant_sites(id) ON DELETE CASCADE,
     tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
     primary_color VARCHAR(10),
     position VARCHAR(20) DEFAULT 'bottom-right',
     welcome_message TEXT,
     ai_name VARCHAR(100),
     show_branding BOOLEAN DEFAULT true,
     auto_open_delay INTEGER DEFAULT 0, -- 0 means disabled
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(site_id)
   );
   ```

2. Add indexes for performance:
   ```sql
   CREATE INDEX widget_configurations_site_id_idx ON widget_configurations(site_id);
   CREATE INDEX widget_configurations_tenant_id_idx ON widget_configurations(tenant_id);
   ```

### 5. UI/UX Updates

1. Add "Configure" button to site cards:
   ```tsx
   <button
       onClick={() => handleConfigureWidget(site)}
       className="btn btn-outline btn-sm rounded-xl group-hover:btn-accent transition-all duration-200"
   >
       <i className="fa-duotone fa-solid fa-sliders mr-2" aria-hidden />
       Configure
   </button>
   ```

2. Add state management for modal:
   ```tsx
   const [configuringSite, setConfiguringSite] = useState<Site | null>(null);
   const [showConfigModal, setShowConfigModal] = useState(false);
   ```

3. Ensure clear visual distinction between:
   - "Widget Setup" (for embedding)
   - "Configure" (for customization)

### 6. Implementation Phases

**Phase 1: Create Components**
- Create WidgetConfiguration component
- Create WidgetConfigurationModal
- Define configuration schema

**Phase 2: Backend Implementation**
- Create database table and migrations
- Implement API endpoints

**Phase 3: UI Integration**
- Add configure button to site manager
- Connect modal to the site manager
- Update settings page to remove widget-specific configuration

**Phase 4: Data Migration**
- Migrate existing widget configuration from settings to site-specific configuration
- Add fallback for backward compatibility

## Technical Considerations

1. **Default Configuration**: New sites should inherit a default configuration
2. **Caching**: Widget configuration should be cached to reduce database load
3. **Validation**: Configuration should be validated before saving
4. **Preview**: Add a preview option to see changes before saving
5. **Real-time Updates**: Widget configuration should update in real-time

## API Design

### GET /api/sites/[siteId]/widget-config
- Returns the widget configuration for a specific site
- Falls back to tenant defaults if no site-specific configuration exists

### POST /api/sites/[siteId]/widget-config
- Updates the widget configuration for a specific site
- Validates configuration before saving

## Future Enhancements

1. **Template Management**: Allow saving configurations as templates
2. **Theme Presets**: Provide preset themes for quick configuration
3. **A/B Testing**: Test different widget configurations
4. **Analytics**: Track engagement based on widget configuration
5. **Preview Mode**: Preview widget with different configurations

## Conclusion

This restructuring will create a more intuitive and flexible approach to managing widget configuration in a multi-site environment. By separating tenant settings from widget configuration and providing site-specific configuration options, we'll improve the user experience and provide a more scalable solution.
