-- Notifications & Preferences (MVP)
-- Creates core tables for in-app notification feed

-- notification types and severities enforced via CHECK constraints (soft enums)
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type text NOT NULL,
    severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','error','critical')),
    title text NOT NULL,
    body text,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    source text NOT NULL DEFAULT 'system',
    event_key text, -- for dedupe (e.g. integration_failed:slack:123)
    group_key text, -- for batching similar events in UI (e.g. ingest:success:batch123)
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    UNIQUE(tenant_id, event_key, created_at)
);

CREATE INDEX IF NOT EXISTS notifications_tenant_idx ON public.notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_event_key_idx ON public.notifications(event_key);
CREATE INDEX IF NOT EXISTS notifications_group_key_idx ON public.notifications(group_key);

-- Per-recipient delivery & read tracking. user_id NULL => broadcast (all current & future members)
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    read_at timestamptz,
    delivered_channels text[] DEFAULT '{}',
    PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS notification_recipients_user_idx ON public.notification_recipients(user_id, read_at);

-- User / tenant preferences per channel & type (wildcard '*')
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    channel text NOT NULL CHECK (channel IN ('in_app','email','slack')),
    type text NOT NULL, -- specific notification type or '*'
    enabled boolean NOT NULL DEFAULT true,
    throttle_window_secs int DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id, channel, type)
);

CREATE INDEX IF NOT EXISTS notification_prefs_user_idx ON public.notification_preferences(user_id);

COMMENT ON TABLE public.notifications IS 'Canonical notification objects (one per event – recipient fanout stored separately).';
COMMENT ON TABLE public.notification_recipients IS 'Recipient read status & channel delivery metadata for notifications.';
COMMENT ON TABLE public.notification_preferences IS 'Per-user channel + type preference & throttling rules.';
