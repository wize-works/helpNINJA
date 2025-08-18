-- Fix plan_status constraint to allow inactive status for new Clerk organizations
-- This ensures that organizations created via Clerk webhooks start as 'inactive' 
-- until they complete onboarding and payment

-- First, check if there's an existing constraint and drop it
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants' 
        AND constraint_name = 'tenants_plan_status_check'
    ) THEN
        ALTER TABLE public.tenants DROP CONSTRAINT tenants_plan_status_check;
    END IF;
END $$;

-- Add the correct constraint that allows all expected values
ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_plan_status_check 
CHECK (plan_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled'));

-- Update the default to 'inactive' to match the intended behavior
-- (Users should start inactive until they complete payment)
ALTER TABLE public.tenants 
ALTER COLUMN plan_status SET DEFAULT 'inactive';
