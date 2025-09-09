# Widget Configuration Restructuring - Planning & Implementation

*Complete documentation for widget configuration system restructuring from tenant-wide to site-specific configuration*

## Overview

The helpNINJA platform has evolved from supporting a single site widget to multiple sites. This document covers both the initial planning and the completed implementation of restructuring widget configuration to better support the multi-site architecture.

## Background & Current State

**Original Challenge:**
- `/dashboard/settings` page contained both tenant-wide settings and widget configuration
- Widget configuration applied globally or to a default site  
- Site management was handled in `/dashboard/sites`
- "Widget Setup" button only provided embedding instructions, not configuration options
- Confusion about which site's widget was being configured

**Goals Achieved:**
1. ✅ Made settings page focused on tenant settings only
2. ✅ Moved widget-specific configuration to site-specific contexts  
3. ✅ Created clear separation between widget embedding and configuration
4. ✅ Maintained backward compatibility with existing implementations
5. ✅ Created intuitive user flow for managing multiple sites and their widgets

## Implementation Details

### Components Implemented

1. **Widget Configuration Component** (`src/components/widget-configuration.tsx`)
   - ✅ Core component containing all customization options
   - ✅ Supports being used both in settings page and in a modal
   - ✅ Provides live preview of widget appearance  
   - ✅ Organized with tabs for appearance, behavior, and content

2. **Widget Configuration Modal** (`src/components/widget-config-modal.tsx`)
   - ✅ Modal wrapper for the widget configuration component
   - ✅ Uses Headless UI for accessibility
   - ✅ Allows configuration directly from the site management page

3. **Default Widget Configuration** (`src/components/default-widget-configuration.tsx`)
   - ✅ Used in the settings page
   - ✅ Shows site selector when multiple sites exist
   - ✅ Wraps the core widget configuration component

### API Implementation

**Endpoints Created:**
- ✅ `GET /api/sites/[id]/widget-config` - Fetch site-specific configuration
- ✅ `POST /api/sites/[id]/widget-config` - Update site-specific configuration
- ✅ Fallback to tenant defaults if no site-specific configuration exists
- ✅ Configuration validation before saving

### Settings Page Restructuring

**Now Focused On Tenant-Wide Settings:**
- ✅ Account information
- ✅ API keys  
- ✅ Billing/subscription management
- ✅ Team management
- ✅ Organization details
- ✅ Global preferences
- ✅ Theme/branding options

### Database Implementation

**New `widget_configurations` table created:**

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

**Migration Details:**
- ✅ Migration script: `src/sql/015_widget_configurations.sql`
- ✅ Unique constraint ensures one config per site
- ✅ CASCADE deletion when site is removed
- ✅ Comprehensive default values for all options

### UI/UX Implementation

**Site Manager Updates** (`src/components/site-manager.tsx`):
- ✅ Added "Configure" button alongside the "Setup" button for verified sites
- ✅ Integrated widget configuration modal
- ✅ Improved button layout in site cards
- ✅ Clear visual distinction between "Widget Setup" (embedding) and "Configure" (customization)

**Configuration Interface:**
```tsx
// Configure button implementation
<button
    onClick={() => handleConfigureWidget(site)}
    className="btn btn-outline btn-sm rounded-xl group-hover:btn-accent transition-all duration-200"
>
    <i className="fa-duotone fa-solid fa-sliders mr-2" aria-hidden />
    Configure
</button>
```

### Configuration Options Available

**Appearance Settings:**
- ✅ Primary Color (brand color for the widget) 
- ✅ Position (bottom-right, bottom-left, top-right, top-left)
- ✅ Button Icon (default/logo, chat, help, message)
- ✅ Theme (light, dark, auto)
- ✅ Font Family (optional custom font)

**Behavior Settings:**
- ✅ Auto-Open Delay (in milliseconds, 0 to disable)
- ✅ Show Branding (toggle for "Powered by helpNINJA")
- ✅ AI Voice (personality/tone: friendly, professional, casual, formal)

**Content Settings:**
- ✅ Welcome Message (initial greeting when chat opens)
- ✅ AI Name (name displayed for the assistant)
- ✅ Custom Icon URL (for personalized branding)

## Implementation Status & Migration

### Completed Phases

**✅ Phase 1: Component Architecture**
- ✅ WidgetConfiguration component created and functional
- ✅ WidgetConfigurationModal implemented with Headless UI
- ✅ Configuration schema defined and validated

**✅ Phase 2: Backend Infrastructure** 
- ✅ Database table created (`widget_configurations`)
- ✅ API endpoints implemented and tested
- ✅ Migration script deployed (`src/sql/015_widget_configurations.sql`)

**✅ Phase 3: UI Integration**
- ✅ Configure button added to site manager
- ✅ Modal connected and fully functional
- ✅ Settings page updated for tenant-only settings

**🔄 Phase 4: Data Migration & Optimization**
- ✅ Backward compatibility maintained
- ✅ Default configuration inheritance for new sites
- 🚧 Migration script for existing configurations (planned)

### Technical Implementation Details

**Configuration Management:**
- ✅ **Default Configuration**: New sites inherit default configuration automatically
- ✅ **Validation**: Configuration validated before saving via API
- ✅ **Live Preview**: Real-time preview of changes in configuration modal  
- ✅ **Caching**: Configuration cached to reduce database load
- ✅ **Fallback**: Falls back to tenant defaults when no site-specific config exists

**API Endpoints:**
- ✅ `GET /api/sites/[id]/widget-config` - Fetch with tenant fallback
- ✅ `POST /api/sites/[id]/widget-config` - Update with validation

### Migration Strategy

**For Existing Users:**
1. **Legacy Support**: Existing widget configurations continue working via fallback system
2. **Gradual Migration**: Users can update configurations as needed via new interface
3. **Data Preservation**: All existing configurations preserved during transition
4. **Validation**: New configurations validated against schema

### Technical Debt & Improvements

**Completed:**
- ✅ TypeScript typing implemented
- ✅ Form validation added
- ✅ Error handling for API calls
- ✅ Widget preview component created and reused

**Future Enhancements:**
- 🔮 **Template Management**: Save configurations as reusable templates
- 🔮 **Theme Presets**: Provide preset themes for quick setup
- 🔮 **A/B Testing**: Test different widget configurations
- 🔮 **Analytics**: Track engagement based on widget configuration
- 🔮 **Advanced Customization**: Custom CSS injection, window sizing
- 🔮 **Conversation Starters**: Pre-defined conversation prompts

## Results & Benefits

**✅ User Experience Improvements:**
- Clear separation between site setup and widget configuration
- Intuitive multi-site widget management
- Real-time configuration preview
- Streamlined settings page focused on tenant concerns

**✅ Technical Benefits:**
- Scalable multi-site architecture
- Maintainable component structure
- Proper data isolation per site
- Backward compatibility preservation

**✅ Business Impact:**
- Reduced user confusion during setup
- Improved onboarding flow for multi-site users  
- Foundation for advanced widget features
- Enhanced customization capabilities per site
