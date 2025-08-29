-- Create feedback system tables for user feedback and feature requests
-- Migration: 068_feedback_system.sql

-- Main feedback table to store user feedback and feature requests
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL, -- Optional link to conversation
    session_id TEXT, -- Widget session ID for anonymous feedback
    
    -- Feedback classification
    type TEXT NOT NULL CHECK (type IN ('bug', 'feature_request', 'improvement', 'general', 'ui_ux', 'performance')),
    category TEXT, -- Optional subcategory (e.g., 'widget', 'dashboard', 'api', 'integrations')
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'planned', 'in_progress', 'completed', 'rejected', 'duplicate')),
    
    -- Content
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    steps_to_reproduce TEXT, -- For bug reports
    expected_behavior TEXT, -- For bug reports
    actual_behavior TEXT, -- For bug reports
    
    -- User information (optional for anonymous feedback)
    user_name TEXT,
    user_email TEXT,
    contact_method TEXT CHECK (contact_method IS NULL OR contact_method IN ('email', 'phone', 'slack', 'none')),
    contact_value TEXT,
    
    -- Technical context
    user_agent TEXT,
    url TEXT, -- Page where feedback was submitted
    widget_version TEXT,
    browser_info JSONB,
    
    -- Metadata and tracking
    tags TEXT[], -- Searchable tags
    votes INTEGER DEFAULT 0, -- Community voting (future feature)
    internal_notes TEXT, -- Admin/dev notes
    related_feedback_ids UUID[], -- Related feedback items
    metadata JSONB DEFAULT '{}', -- Flexible metadata storage
    
    -- Escalation tracking
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalation_rule_id UUID REFERENCES public.escalation_rules(id),
    escalated_to JSONB, -- Track which integrations were notified
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Feedback attachments table for screenshots, files, etc.
CREATE TABLE IF NOT EXISTS public.feedback_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL, -- Path to stored file
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback comments/updates table for internal tracking and user communication
CREATE TABLE IF NOT EXISTS public.feedback_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL CHECK (author_type IN ('user', 'admin', 'system')),
    author_name TEXT,
    author_email TEXT,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- Internal admin comments vs user-visible
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_id ON public.feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_conversation_id ON public.feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session_id ON public.feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON public.feedback(priority);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_status ON public.feedback(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_type ON public.feedback(tenant_id, type);

-- GIN indexes for JSONB and array columns
CREATE INDEX IF NOT EXISTS idx_feedback_tags ON public.feedback USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_feedback_metadata ON public.feedback USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_feedback_browser_info ON public.feedback USING GIN(browser_info);

-- Indexes for attachments and comments
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_feedback_id ON public.feedback_attachments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback_id ON public.feedback_comments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_created_at ON public.feedback_comments(created_at);

-- Add full-text search on feedback content
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS search_vector tsvector 
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(steps_to_reproduce, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(expected_behavior, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(actual_behavior, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(internal_notes, '')), 'D')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_feedback_search_vector ON public.feedback USING GIN(search_vector);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- Function to automatically escalate high-priority feedback
CREATE OR REPLACE FUNCTION auto_escalate_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-escalate urgent feedback or bugs
    IF NEW.priority = 'urgent' OR (NEW.type = 'bug' AND NEW.priority = 'high') THEN
        -- Mark as escalated (actual escalation will be handled by application code)
        NEW.escalated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_auto_escalate_feedback
    BEFORE INSERT ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION auto_escalate_feedback();

-- Create view for feedback analytics
CREATE OR REPLACE VIEW public.feedback_analytics AS
SELECT 
    tenant_id,
    type,
    status,
    priority,
    COUNT(*) as feedback_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as feedback_last_30_days,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE escalated_at IS NOT NULL) as escalated_count,
    AVG(EXTRACT(epoch FROM (resolved_at - created_at))/3600)::integer as avg_resolution_hours,
    DATE_TRUNC('month', created_at) as month
FROM public.feedback
GROUP BY tenant_id, type, status, priority, DATE_TRUNC('month', created_at);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON public.feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feedback_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feedback_comments TO authenticated;
GRANT SELECT ON public.feedback_analytics TO authenticated;

-- Add RLS policies (Row Level Security)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access feedback for their tenant
CREATE POLICY feedback_tenant_isolation ON public.feedback
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY feedback_attachments_tenant_isolation ON public.feedback_attachments
    FOR ALL USING (
        feedback_id IN (
            SELECT id FROM public.feedback 
            WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
        )
    );

CREATE POLICY feedback_comments_tenant_isolation ON public.feedback_comments
    FOR ALL USING (
        feedback_id IN (
            SELECT id FROM public.feedback 
            WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
        )
    );

-- Insert sample feedback categories for reference
INSERT INTO public.feedback (
    id, tenant_id, type, category, title, description, priority, status, 
    user_name, created_at
) VALUES 
    (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000', -- System tenant for examples
        'feature_request',
        'widget',
        'Sample: Dark mode for chat widget',
        'It would be great if the chat widget had a dark mode option to match our website theme.',
        'medium',
        'open',
        'System Example',
        NOW()
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000000',
        'bug',
        'dashboard',
        'Sample: Analytics not updating in real-time',
        'The analytics dashboard shows outdated information and requires a page refresh to see new data.',
        'high',
        'in_review',
        'System Example',
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.feedback IS 'Stores user feedback, feature requests, and bug reports';
COMMENT ON TABLE public.feedback_attachments IS 'File attachments for feedback items (screenshots, logs, etc.)';
COMMENT ON TABLE public.feedback_comments IS 'Comments and updates on feedback items for tracking and communication';
COMMENT ON VIEW public.feedback_analytics IS 'Aggregated analytics view for feedback reporting and insights';
