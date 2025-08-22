-- Add additional widget styling options to widget_configurations table
DO $$
BEGIN
    -- Add bubbleBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'bubble_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN bubble_background VARCHAR(20) DEFAULT '#111';
    END IF;

    -- Add bubbleColor if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'bubble_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN bubble_color VARCHAR(20) DEFAULT '#fff';
    END IF;

    -- Add panelBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'panel_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN panel_background VARCHAR(20) DEFAULT '#fff';
    END IF;

    -- Add panelHeaderBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'panel_header_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN panel_header_background VARCHAR(20) DEFAULT '#f8fafc';
    END IF;

    -- Add messagesBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'messages_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN messages_background VARCHAR(20) DEFAULT '#f8fafc';
    END IF;

    -- Add userBubbleBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'user_bubble_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN user_bubble_background VARCHAR(20) DEFAULT '#3b82f6';
    END IF;

    -- Add userBubbleColor if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'user_bubble_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN user_bubble_color VARCHAR(20) DEFAULT '#fff';
    END IF;

    -- Add assistantBubbleBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'assistant_bubble_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN assistant_bubble_background VARCHAR(20) DEFAULT '#e5e7eb';
    END IF;

    -- Add assistantBubbleColor if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'assistant_bubble_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN assistant_bubble_color VARCHAR(20) DEFAULT '#111';
    END IF;

    -- Add buttonBackground if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'button_background') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN button_background VARCHAR(20) DEFAULT '#111';
    END IF;

    -- Add buttonColor if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'button_color') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN button_color VARCHAR(20) DEFAULT '#fff';
    END IF;

    -- Add advanced_colors if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'widget_configurations' 
                   AND column_name = 'advanced_colors') THEN
        ALTER TABLE public.widget_configurations 
        ADD COLUMN advanced_colors boolean DEFAULT false;
    END IF;
END
$$;

-- Update the primary_color description to clarify its use
COMMENT ON COLUMN widget_configurations.primary_color IS 'Legacy primary color (used for branding)';
COMMENT ON COLUMN widget_configurations.advanced_colors IS 'Enalbe advanced colors for branding';

-- Add comments to new columns
COMMENT ON COLUMN widget_configurations.bubble_background IS 'Background color of the chat bubble';
COMMENT ON COLUMN widget_configurations.bubble_color IS 'Text/icon color of the chat bubble';
COMMENT ON COLUMN widget_configurations.panel_background IS 'Background color of the main chat panel';
COMMENT ON COLUMN widget_configurations.panel_header_background IS 'Background color of the chat panel header';
COMMENT ON COLUMN widget_configurations.messages_background IS 'Background color of the messages area';
COMMENT ON COLUMN widget_configurations.user_bubble_background IS 'Background color of user message bubbles';
COMMENT ON COLUMN widget_configurations.user_bubble_color IS 'Text color of user message bubbles';
COMMENT ON COLUMN widget_configurations.assistant_bubble_background IS 'Background color of assistant message bubbles';
COMMENT ON COLUMN widget_configurations.assistant_bubble_color IS 'Text color of assistant message bubbles';
COMMENT ON COLUMN widget_configurations.button_background IS 'Background color of the send button';
COMMENT ON COLUMN widget_configurations.button_color IS 'Text color of the send button';

-- Update the schema version
INSERT INTO schema_migrations (version) VALUES ('058_widget_styling_config') ON CONFLICT DO NOTHING;
