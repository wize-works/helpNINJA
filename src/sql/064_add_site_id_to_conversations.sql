-- Migration: add site_id to conversations (supersedes older tenant_site_id naming) and backfill
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='conversations' AND column_name='site_id'
    ) THEN
        ALTER TABLE public.conversations ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;

    -- Backfill from tenant_site_id if site_id is null and legacy column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='conversations' AND column_name='tenant_site_id'
    ) THEN
        UPDATE public.conversations c
        SET site_id = c.tenant_site_id
        WHERE c.site_id IS NULL AND c.tenant_site_id IS NOT NULL;
    END IF;
END $$;

-- Helpful index if not already present
CREATE INDEX IF NOT EXISTS conversations_site_id_idx ON public.conversations(site_id);
CREATE INDEX IF NOT EXISTS conversations_tenant_site_composite2_idx ON public.conversations(tenant_id, site_id);

-- Ensure messages table has site_id (some earlier environments may have missed prior migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='messages' AND column_name='site_id'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
    END IF;

    -- Backfill messages.site_id from legacy tenant_site_id if present
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='messages' AND column_name='tenant_site_id'
    ) THEN
        UPDATE public.messages m
        SET site_id = m.tenant_site_id
        WHERE m.site_id IS NULL AND m.tenant_site_id IS NOT NULL;
    END IF;

    -- Backfill messages.site_id from conversations.site_id
    UPDATE public.messages m
    SET site_id = c.site_id
    FROM public.conversations c
    WHERE m.conversation_id = c.id
      AND m.site_id IS NULL
      AND c.site_id IS NOT NULL;
END $$;

-- Helpful indexes for messages if not present
CREATE INDEX IF NOT EXISTS messages_site_id_idx ON public.messages(site_id);
CREATE INDEX IF NOT EXISTS messages_tenant_site_composite2_idx ON public.messages(tenant_id, site_id);
