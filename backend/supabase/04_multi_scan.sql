-- ============================================================
-- METRIScan — MULTI-SCAN PRODUCT EXTENSION
-- Tables for multi-product scanning, grouping, and deduplication
-- ============================================================

-- 1. Multi-Scan Sessions Table
CREATE TABLE IF NOT EXISTS public.multi_scan_sessions (
    id TEXT PRIMARY KEY,
    created_by TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    total_images INT NOT NULL DEFAULT 0,
    total_products INT NOT NULL DEFAULT 0,
    completed_products INT NOT NULL DEFAULT 0,
    failed_products INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multi_scan_sessions_created_by ON public.multi_scan_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_multi_scan_sessions_status ON public.multi_scan_sessions(status);
CREATE INDEX IF NOT EXISTS idx_multi_scan_sessions_created_at ON public.multi_scan_sessions(created_at DESC);

-- 2. Multi-Scan Images Table
CREATE TABLE IF NOT EXISTS public.multi_scan_images (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.multi_scan_sessions(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    image_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multi_scan_images_session_id ON public.multi_scan_images(session_id);

-- 3. Multi-Scan Unique Products Table
CREATE TABLE IF NOT EXISTS public.multi_scan_products (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.multi_scan_sessions(id) ON DELETE CASCADE,
    product_identity TEXT,
    barcode TEXT,
    license_number TEXT,
    batch_number TEXT,
    product_name TEXT,
    brand TEXT,
    identity_confidence FLOAT DEFAULT 1.0,
    analysis_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED
    error_message TEXT,
    inspection_id TEXT,
    result_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multi_scan_products_session_id ON public.multi_scan_products(session_id);
CREATE INDEX IF NOT EXISTS idx_multi_scan_products_barcode ON public.multi_scan_products(barcode);

-- 4. Multi-Scan Product to Image Mapping (Front / Back / Full)
CREATE TABLE IF NOT EXISTS public.multi_scan_product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.multi_scan_products(id) ON DELETE CASCADE,
    image_id TEXT NOT NULL REFERENCES public.multi_scan_images(id) ON DELETE CASCADE,
    side TEXT NOT NULL DEFAULT 'full', -- front, back, side, full
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multi_scan_product_images_product_id ON public.multi_scan_product_images(product_id);

-- Enable RLS
ALTER TABLE public.multi_scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_scan_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_scan_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_scan_product_images ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public full access to multi_scan_sessions" ON public.multi_scan_sessions FOR ALL USING (true);
CREATE POLICY "Public full access to multi_scan_images" ON public.multi_scan_images FOR ALL USING (true);
CREATE POLICY "Public full access to multi_scan_products" ON public.multi_scan_products FOR ALL USING (true);
CREATE POLICY "Public full access to multi_scan_product_images" ON public.multi_scan_product_images FOR ALL USING (true);

-- 5. Extend inspections and consumer_scans for multi-scan tracking
ALTER TABLE IF EXISTS public.inspections ADD COLUMN IF NOT EXISTS scan_type VARCHAR(50) DEFAULT 'SINGLE_SCAN';
ALTER TABLE IF EXISTS public.inspections ADD COLUMN IF NOT EXISTS multi_scan_session_id VARCHAR(100);

ALTER TABLE IF EXISTS public.consumer_scans ADD COLUMN IF NOT EXISTS scan_type VARCHAR(50) DEFAULT 'SINGLE_SCAN';
ALTER TABLE IF EXISTS public.consumer_scans ADD COLUMN IF NOT EXISTS multi_scan_session_id VARCHAR(100);
