-- Add panel text color fields to widget_configurations table
DO $$
BEGIN
    -- Add panel_color if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'panel_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN panel_color VARCHAR(20) DEFAULT '#333333';
    END IF;

    -- Add panel_header_color if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'panel_header_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN panel_header_color VARCHAR(20) DEFAULT '#ffffff';
    END IF;
END
$$;

-- Add comments to new columns
COMMENT ON COLUMN widget_configurations.panel_color IS 'Text color for the main chat panel';
COMMENT ON COLUMN widget_configurations.panel_header_color IS 'Text color for the chat panel header';

-- Update the schema version
INSERT INTO schema_migrations (version) VALUES ('069_add_panel_colors') ON CONFLICT DO NOTHING;
