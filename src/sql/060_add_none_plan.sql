-- Migration to add 'none' plan option and update constraints
-- This allows organizations created via Clerk to have a proper "no plan selected" state

-- First, check if there's an existing plan constraint and drop it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'tenants' 
        AND constraint_name = 'tenants_plan_check'
    ) THEN
        ALTER TABLE public.tenants DROP CONSTRAINT tenants_plan_check;
    END IF;
END $$;

-- Add the updated plan constraint that includes 'none'
ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_plan_check 
    CHECK (plan IN ('none', 'starter', 'pro', 'agency'));

-- Update the default value for new organizations
ALTER TABLE public.tenants 
ALTER COLUMN plan SET DEFAULT 'none';

-- Note: We don't update existing 'starter' plan organizations because they
-- may have been legitimately set up with starter plan access. Only new
-- organizations created via Clerk webhook will get 'none' plan by default.
