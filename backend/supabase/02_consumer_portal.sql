-- ============================================================
-- METRISCAN CONSUMER / PUBLIC USER PORTAL MIGRATION
-- Migration: 02_consumer_portal.sql
-- ============================================================

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. CONSUMER USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consumer_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consumer_users_username ON public.consumer_users(username);
CREATE INDEX IF NOT EXISTS idx_consumer_users_auth_id ON public.consumer_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_consumer_users_email ON public.consumer_users(email);

-- ============================================================
-- 2. CONSUMER SCANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consumer_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_user_id UUID REFERENCES public.consumer_users(id) ON DELETE CASCADE,
    product_name TEXT,
    brand TEXT,
    barcode TEXT,
    manufacturer TEXT,
    manufacturing_date TEXT,
    packed_on TEXT,
    expiry_date TEXT,
    best_before TEXT,
    batch_number TEXT,
    mrp TEXT,
    net_quantity TEXT,
    ingredients JSONB DEFAULT '[]'::jsonb,
    nutrition_data JSONB DEFAULT '{}'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    legal_compliance_status TEXT DEFAULT 'REVIEW',
    compliance_score NUMERIC DEFAULT 0.0,
    compliance_details JSONB DEFAULT '{}'::jsonb,
    image_storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consumer_scans_user_id ON public.consumer_scans(consumer_user_id);
CREATE INDEX IF NOT EXISTS idx_consumer_scans_created_at ON public.consumer_scans(created_at DESC);

-- ============================================================
-- 3. CONSUMER SCAN ISSUES TABLE (INTERNAL ADMIN ENFORCEMENT ALERTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consumer_scan_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_scan_id UUID REFERENCES public.consumer_scans(id) ON DELETE CASCADE,
    consumer_user_id UUID REFERENCES public.consumer_users(id) ON DELETE SET NULL,
    product_name TEXT,
    barcode TEXT,
    license_number TEXT,
    manufacturer TEXT,
    rule_status TEXT DEFAULT 'FAIL',
    failed_rules JSONB DEFAULT '[]'::jsonb,
    priority TEXT DEFAULT 'HIGH',
    location_latitude NUMERIC,
    location_longitude NUMERIC,
    location_accuracy NUMERIC,
    location_address TEXT,
    image_storage_path TEXT,
    status TEXT DEFAULT 'NEW', -- NEW, UNDER_REVIEW, RESOLVED, REJECTED
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_consumer_scan_issues_status ON public.consumer_scan_issues(status);
CREATE INDEX IF NOT EXISTS idx_consumer_scan_issues_priority ON public.consumer_scan_issues(priority);
CREATE INDEX IF NOT EXISTS idx_consumer_scan_issues_created_at ON public.consumer_scan_issues(created_at DESC);

-- ============================================================
-- 4. CONSUMER ISSUES TABLE (USER SUBMITTED ISSUES)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consumer_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_user_id UUID REFERENCES public.consumer_users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT NOT NULL,
    barcode TEXT,
    lot_number TEXT,
    image_storage_path TEXT,
    audio_storage_path TEXT,
    location_latitude NUMERIC,
    location_longitude NUMERIC,
    location_accuracy NUMERIC,
    location_address TEXT,
    status TEXT DEFAULT 'SUBMITTED', -- SUBMITTED, UNDER_REVIEW, RESOLVED, REJECTED
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_consumer_issues_user_id ON public.consumer_issues(consumer_user_id);
CREATE INDEX IF NOT EXISTS idx_consumer_issues_category ON public.consumer_issues(category);
CREATE INDEX IF NOT EXISTS idx_consumer_issues_status ON public.consumer_issues(status);
CREATE INDEX IF NOT EXISTS idx_consumer_issues_created_at ON public.consumer_issues(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.consumer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_scan_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_issues ENABLE ROW LEVEL SECURITY;

-- Consumer Users policies
CREATE POLICY "Consumers can view own profile"
ON public.consumer_users FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "Consumers can update own profile"
ON public.consumer_users FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid());

-- Consumer Scans policies
CREATE POLICY "Consumers can view own scans"
ON public.consumer_scans FOR SELECT
TO authenticated
USING (
    consumer_user_id IN (
        SELECT id FROM public.consumer_users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "Consumers can insert own scans"
ON public.consumer_scans FOR INSERT
TO authenticated
WITH CHECK (
    consumer_user_id IN (
        SELECT id FROM public.consumer_users WHERE auth_user_id = auth.uid()
    )
);

-- Consumer Issues policies
CREATE POLICY "Consumers can view own issues"
ON public.consumer_issues FOR SELECT
TO authenticated
USING (
    consumer_user_id IN (
        SELECT id FROM public.consumer_users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "Consumers can insert own issues"
ON public.consumer_issues FOR INSERT
TO authenticated
WITH CHECK (
    consumer_user_id IN (
        SELECT id FROM public.consumer_users WHERE auth_user_id = auth.uid()
    )
);

-- Admin policies
CREATE POLICY "Admins can view all scan issues"
ON public.consumer_scan_issues FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can update scan issues"
ON public.consumer_scan_issues FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can view all user issues"
ON public.consumer_issues FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can update user issues"
ON public.consumer_issues FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Service Role full access
CREATE POLICY "Service role full access on consumer_users"
ON public.consumer_users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access on consumer_scans"
ON public.consumer_scans FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access on consumer_scan_issues"
ON public.consumer_scan_issues FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access on consumer_issues"
ON public.consumer_issues FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
