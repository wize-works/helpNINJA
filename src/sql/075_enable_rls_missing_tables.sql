-- 075_enable_rls_missing_tables.sql
-- Purpose: Ensure all tenant-scoped tables have Row Level Security (RLS) enabled
-- and add consistent tenant isolation policies. Idempotent and safe to re-run.

-- Helper note: Policies allow either
-- 1) tenant context via current_setting('app.current_tenant_id', true)
-- 2) Supabase auth via membership check (auth.uid() in public.tenant_members)

-- ===============
-- Tenant Sites
-- ===============
ALTER TABLE public.tenant_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_sites_isolation ON public.tenant_sites;
CREATE POLICY tenant_sites_isolation ON public.tenant_sites
  FOR ALL
  USING (
    (
      current_setting('app.current_tenant_id', true) IS NOT NULL
      AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
    ) OR EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.tenant_sites.tenant_id
        AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (
      current_setting('app.current_tenant_id', true) IS NOT NULL
      AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- ===============
-- Widget Configurations (site-scoped)
-- ===============
ALTER TABLE public.widget_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS widget_configs_isolation ON public.widget_configurations;
CREATE POLICY widget_configs_isolation ON public.widget_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_sites s
      WHERE s.id = public.widget_configurations.site_id
        AND (
          (current_setting('app.current_tenant_id', true) IS NOT NULL AND s.tenant_id = current_setting('app.current_tenant_id', true)::uuid)
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = s.tenant_id AND tm.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_sites s
      WHERE s.id = public.widget_configurations.site_id
        AND (current_setting('app.current_tenant_id', true) IS NOT NULL AND s.tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    )
  );

-- ===============
-- API Management
-- ===============
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_keys_isolation ON public.api_keys;
CREATE POLICY api_keys_isolation ON public.api_keys
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.api_keys.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhooks_isolation ON public.webhook_endpoints;
CREATE POLICY webhooks_isolation ON public.webhook_endpoints
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.webhook_endpoints.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_deliveries_isolation ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_isolation ON public.webhook_deliveries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.webhook_endpoints we
      WHERE we.id = public.webhook_deliveries.webhook_endpoint_id
        AND (
          (current_setting('app.current_tenant_id', true) IS NOT NULL AND we.tenant_id = current_setting('app.current_tenant_id', true)::uuid)
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = we.tenant_id AND tm.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.webhook_endpoints we
      WHERE we.id = public.webhook_deliveries.webhook_endpoint_id
        AND current_setting('app.current_tenant_id', true) IS NOT NULL
        AND we.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS api_usage_logs_isolation ON public.api_usage_logs;
CREATE POLICY api_usage_logs_isolation ON public.api_usage_logs
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.api_usage_logs.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ===============
-- Telemetry & Audit
-- ===============
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS telemetry_events_isolation ON public.telemetry_events;
CREATE POLICY telemetry_events_isolation ON public.telemetry_events
  FOR ALL
  USING (
    tenant_id IS NOT NULL AND (
      (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
      OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.telemetry_events.tenant_id AND tm.user_id = auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IS NOT NULL AND current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Only allow tenant-scoped reads; writes are expected via service role
DROP POLICY IF EXISTS audit_logs_tenant_select ON public.audit_logs;
CREATE POLICY audit_logs_tenant_select ON public.audit_logs
  FOR SELECT
  USING (
    tenant_id IS NOT NULL AND (
      (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
      OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.audit_logs.tenant_id AND tm.user_id = auth.uid())
    )
  );

-- ===============
-- Notifications (3 tables)
-- ===============
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_isolation ON public.notifications;
CREATE POLICY notifications_isolation ON public.notifications
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.notifications.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_recipients_isolation ON public.notification_recipients;
CREATE POLICY notification_recipients_isolation ON public.notification_recipients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = public.notification_recipients.notification_id
        AND (
          (current_setting('app.current_tenant_id', true) IS NOT NULL AND n.tenant_id = current_setting('app.current_tenant_id', true)::uuid)
          OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = n.tenant_id AND tm.user_id = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = public.notification_recipients.notification_id
        AND current_setting('app.current_tenant_id', true) IS NOT NULL
        AND n.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_prefs_isolation ON public.notification_preferences;
CREATE POLICY notification_prefs_isolation ON public.notification_preferences
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.notification_preferences.tenant_id AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ===============
-- Escalations & related
-- ===============
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS escalations_isolation ON public.escalations;
CREATE POLICY escalations_isolation ON public.escalations
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.escalations.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

ALTER TABLE public.conversation_contact_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS convo_contact_isolation ON public.conversation_contact_info;
CREATE POLICY convo_contact_isolation ON public.conversation_contact_info
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.conversation_contact_info.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

ALTER TABLE public.pending_escalations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pending_escalations_isolation ON public.pending_escalations;
CREATE POLICY pending_escalations_isolation ON public.pending_escalations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = public.pending_escalations.conversation_id
        AND (
          (current_setting('app.current_tenant_id', true) IS NOT NULL AND c.tenant_id = current_setting('app.current_tenant_id', true)::uuid)
          OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = c.tenant_id AND tm.user_id = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = public.pending_escalations.conversation_id
        AND current_setting('app.current_tenant_id', true) IS NOT NULL
        AND c.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- ===============
-- Team Activity & Invitations (legacy)
-- ===============
ALTER TABLE public.team_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_activity_isolation ON public.team_activity;
CREATE POLICY team_activity_isolation ON public.team_activity
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.team_activity.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- team_invitations exists in some envs; protect if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='team_invitations') THEN
    EXECUTE 'ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY';
    -- Drop/create via EXECUTE to avoid failure if table changes shape over time
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_invitations' AND policyname='team_invitations_isolation') THEN
      EXECUTE 'DROP POLICY team_invitations_isolation ON public.team_invitations';
    END IF;
    EXECUTE $pol$
      CREATE POLICY team_invitations_isolation ON public.team_invitations
        FOR ALL
        USING (
          (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
          OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.team_invitations.tenant_id AND tm.user_id = auth.uid())
        )
        WITH CHECK (
          current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
        )
    $pol$;
  END IF;
END $$;

-- ===============
-- Conversation Shares
-- ===============
ALTER TABLE public.conversation_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conversation_shares_isolation ON public.conversation_shares;
CREATE POLICY conversation_shares_isolation ON public.conversation_shares
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.conversation_shares.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Note: Tables intentionally NOT RLS-scoped here:
-- - public.role_permissions (global static mapping)

-- End of migration
 
-- ===============
-- Core tables missing explicit policies (RLS already enabled earlier)
-- ===============

-- Events (analytics log)
DROP POLICY IF EXISTS events_isolation ON public.events;
CREATE POLICY events_isolation ON public.events
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.events.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Usage counters
DROP POLICY IF EXISTS usage_counters_isolation ON public.usage_counters;
CREATE POLICY usage_counters_isolation ON public.usage_counters
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.usage_counters.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Answers
DROP POLICY IF EXISTS answers_isolation ON public.answers;
CREATE POLICY answers_isolation ON public.answers
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.answers.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Sources
DROP POLICY IF EXISTS sources_isolation ON public.sources;
CREATE POLICY sources_isolation ON public.sources
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.sources.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Chunks
DROP POLICY IF EXISTS chunks_isolation ON public.chunks;
CREATE POLICY chunks_isolation ON public.chunks
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.chunks.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Conversations
DROP POLICY IF EXISTS conversations_isolation ON public.conversations;
CREATE POLICY conversations_isolation ON public.conversations
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.conversations.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Messages
DROP POLICY IF EXISTS messages_isolation ON public.messages;
CREATE POLICY messages_isolation ON public.messages
  FOR ALL
  USING (
    (current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = public.messages.tenant_id AND tm.user_id = auth.uid())
  )
  WITH CHECK (
    current_setting('app.current_tenant_id', true) IS NOT NULL AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );
