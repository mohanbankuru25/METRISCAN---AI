-- ============================================================
-- 05_analysis_cache.sql
-- Table for deterministic image analysis result caching
-- Shared across Inspector and Consumer portals
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analysis_cache (
    image_hash TEXT PRIMARY KEY,
    pipeline_version TEXT NOT NULL,
    product_name TEXT,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_hash_ver 
ON public.analysis_cache(image_hash, pipeline_version);

ALTER TABLE public.analysis_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on analysis_cache"
ON public.analysis_cache FOR ALL
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read cached analyses
CREATE POLICY "Authenticated users can read analysis_cache"
ON public.analysis_cache FOR SELECT
TO authenticated
USING (true);
