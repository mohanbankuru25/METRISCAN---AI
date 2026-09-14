-- ============================================================
-- METRISCAN COMMUNITY ISSUE FEED & UPVOTES MIGRATION
-- Migration: 03_community_feed.sql
-- ============================================================

-- Add community feed fields to consumer_issues
ALTER TABLE public.consumer_issues 
ADD COLUMN IF NOT EXISTS confirmations_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS confirmed_by_users JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'LOW',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_consumer_issues_priority ON public.consumer_issues(priority);
CREATE INDEX IF NOT EXISTS idx_consumer_issues_confirmations ON public.consumer_issues(confirmations_count DESC);
CREATE INDEX IF NOT EXISTS idx_consumer_issues_coords ON public.consumer_issues(location_latitude, location_longitude);

-- Policy to allow citizens to view public community issues without exposing private user info
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'consumer_issues' 
        AND policyname = 'Public can view sanitized community issues'
    ) THEN
        CREATE POLICY "Public can view sanitized community issues"
        ON public.consumer_issues FOR SELECT
        TO authenticated
        USING (is_public = TRUE);
    END IF;
END $$;
