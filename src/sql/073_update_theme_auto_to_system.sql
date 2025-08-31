-- Update theme field from 'auto' to 'system' for consistency
-- Migration to standardize theme naming across the application

-- Update existing records that have 'auto' theme to 'system'
UPDATE widget_configurations 
SET theme = 'system' 
WHERE theme = 'auto';

-- Update the default value for the theme column
ALTER TABLE widget_configurations 
ALTER COLUMN theme SET DEFAULT 'system';

-- Add a comment to document the change
COMMENT ON COLUMN widget_configurations.theme IS 'Widget theme setting: light, dark, or system (follows user preference)';
