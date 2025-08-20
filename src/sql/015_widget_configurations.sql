-- Create widget_configurations table
CREATE TABLE IF NOT EXISTS widget_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES tenant_sites(id) ON DELETE CASCADE,
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS widget_config_site_id_idx ON widget_configurations(site_id);

-- Add comment to table
COMMENT ON TABLE widget_configurations IS 'Stores site-specific widget customization settings';
