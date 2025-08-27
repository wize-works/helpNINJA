-- Enhance answers table for curated response management
-- This allows answers to be associated with specific sites and given priority

-- Add missing columns to answers table
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.tenant_sites(id) ON DELETE SET NULL;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS priority int NOT NULL DEFAULT 0;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'disabled'));
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS answers_site_idx ON public.answers(tenant_id, site_id);
CREATE INDEX IF NOT EXISTS answers_status_idx ON public.answers(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS answers_priority_idx ON public.answers(priority DESC);
CREATE INDEX IF NOT EXISTS answers_keywords_idx ON public.answers USING gin(keywords);
CREATE INDEX IF NOT EXISTS answers_tags_idx ON public.answers USING gin(tags);

-- Create full-text search index for questions
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS question_tsv tsvector;
UPDATE public.answers SET question_tsv = to_tsvector('english', question);
CREATE INDEX IF NOT EXISTS answers_question_tsv_idx ON public.answers USING gin(question_tsv);

-- Create trigger to update question_tsv automatically
CREATE OR REPLACE FUNCTION update_answers_question_tsv() RETURNS trigger AS $$
BEGIN
    NEW.question_tsv = to_tsvector('english', NEW.question);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS answers_question_tsv_trigger ON public.answers;
CREATE TRIGGER answers_question_tsv_trigger
    BEFORE INSERT OR UPDATE ON public.answers
    FOR EACH ROW EXECUTE FUNCTION update_answers_question_tsv();
