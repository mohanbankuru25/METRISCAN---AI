-- ============================================================
-- SIH-G LEGAL METROLOGY INSPECTION DATABASE
-- Supabase PostgreSQL Schema
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES
-- ============================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    full_name text not null,

    email text,

    role text not null default 'inspector'
        check (role in ('admin', 'inspector')),

    phone text,

    designation text,

    department text,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. PRODUCTS
-- ============================================================

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),

    product_name text,

    category text,

    net_quantity text,

    mrp text,

    batch_number text,

    packed_on text,

    manufactured_on text,

    best_before text,

    use_by text,

    expiry_date text,

    manufacturer_or_packer text,

    address text,

    marketed_by text,

    consumer_contact text,

    country_of_origin text,

    fssai_license text,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 3. INSPECTIONS
-- ============================================================

create table if not exists public.inspections (
    id uuid primary key default gen_random_uuid(),

    inspection_number text unique not null,

    inspector_id uuid references public.profiles(id),

    product_id uuid references public.products(id),

    status text not null default 'REVIEW'
        check (
            status in (
                'PASS',
                'FAIL',
                'REVIEW'
            )
        ),

    compliance_score numeric(5,2),

    total_rules integer default 0,

    passed_rules integer default 0,

    failed_rules integer default 0,

    review_rules integer default 0,

    not_applicable_rules integer default 0,

    out_of_scope_rules integer default 0,

    inspection_date timestamptz not null default now(),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- ============================================================
-- 4. OCR RESULTS
-- ============================================================

create table if not exists public.ocr_results (
    id uuid primary key default gen_random_uuid(),

    inspection_id uuid not null
        references public.inspections(id)
        on delete cascade,

    full_text text,

    text_blocks jsonb,

    confidence numeric(6,3),

    bbox_count integer default 0,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 5. COMPLIANCE RESULTS
-- ============================================================

create table if not exists public.compliance_results (
    id uuid primary key default gen_random_uuid(),

    inspection_id uuid not null
        references public.inspections(id)
        on delete cascade,

    rule_id text not null,

    rule_name text,

    requirement text,

    status text not null
        check (
            status in (
                'PASS',
                'FAIL',
                'REVIEW',
                'NOT_APPLICABLE',
                'OUT_OF_SCOPE'
            )
        ),

    evidence text,

    recommendation text,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 6. VISUAL ANALYSIS
-- ============================================================

create table if not exists public.visual_analysis (
    id uuid primary key default gen_random_uuid(),

    inspection_id uuid not null
        references public.inspections(id)
        on delete cascade,

    engine text,

    text_blocks integer,

    median_height numeric,

    min_height numeric,

    max_height numeric,

    mean_ocr_confidence numeric,

    high_confidence_ratio numeric,

    local_contrast numeric,

    detected_declarations integer,

    bbox_count integer,

    calibrated boolean default false,

    text_size_status text,

    placement_status text,

    readability_status text,

    declaration_visibility_status text,

    raw_analysis jsonb,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 7. EVIDENCE
-- ============================================================

create table if not exists public.inspection_evidence (
    id uuid primary key default gen_random_uuid(),

    inspection_id uuid not null
        references public.inspections(id)
        on delete cascade,

    evidence_type text not null
        check (
            evidence_type in (
                'original_image',
                'processed_image',
                'cropped_evidence',
                'other'
            )
        ),

    storage_path text not null,

    public_url text,

    description text,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 8. REPORTS
-- ============================================================

create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),

    inspection_id uuid not null
        references public.inspections(id)
        on delete cascade,

    report_number text,

    pdf_path text,

    docx_path text,

    generated_by uuid references public.profiles(id),

    generated_at timestamptz not null default now()
);


-- ============================================================
-- 9. AUDIT LOG
-- ============================================================

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references public.profiles(id),

    action text not null,

    entity_type text,

    entity_id uuid,

    description text,

    metadata jsonb,

    created_at timestamptz not null default now()
);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_inspections_inspector
on public.inspections(inspector_id);

create index if not exists idx_inspections_status
on public.inspections(status);

create index if not exists idx_inspections_date
on public.inspections(inspection_date desc);

create index if not exists idx_compliance_inspection
on public.compliance_results(inspection_id);

create index if not exists idx_ocr_inspection
on public.ocr_results(inspection_id);

create index if not exists idx_visual_inspection
on public.visual_analysis(inspection_id);

create index if not exists idx_evidence_inspection
on public.inspection_evidence(inspection_id);

create index if not exists idx_reports_inspection
on public.reports(inspection_id);


-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public)
values
    ('inspection-images', 'inspection-images', false),
    ('inspection-reports', 'inspection-reports', false)
on conflict (id) do nothing;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.inspections enable row level security;
alter table public.ocr_results enable row level security;
alter table public.compliance_results enable row level security;
alter table public.visual_analysis enable row level security;
alter table public.inspection_evidence enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;


-- ============================================================
-- PROFILE POLICIES
-- ============================================================

create policy "users can view own profile"
on public.profiles
for select
to authenticated
using (
    id = auth.uid()
);


create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (
    id = auth.uid()
);


-- ============================================================
-- INSPECTION POLICIES
-- ============================================================

create policy "inspectors can view own inspections"
on public.inspections
for select
to authenticated
using (
    inspector_id = auth.uid()
);


create policy "inspectors can create inspections"
on public.inspections
for insert
to authenticated
with check (
    inspector_id = auth.uid()
);


-- ============================================================
-- PRODUCT POLICIES
-- ============================================================

create policy "authenticated users can view products"
on public.products
for select
to authenticated
using (true);


-- ============================================================
-- OCR POLICIES
-- ============================================================

create policy "authenticated users can view OCR"
on public.ocr_results
for select
to authenticated
using (
    exists (
        select 1
        from public.inspections i
        where i.id = inspection_id
        and i.inspector_id = auth.uid()
    )
);


-- ============================================================
-- COMPLIANCE POLICIES
-- ============================================================

create policy "authenticated users can view compliance"
on public.compliance_results
for select
to authenticated
using (
    exists (
        select 1
        from public.inspections i
        where i.id = inspection_id
        and i.inspector_id = auth.uid()
    )
);


-- ============================================================
-- VISUAL ANALYSIS POLICIES
-- ============================================================

create policy "authenticated users can view visual analysis"
on public.visual_analysis
for select
to authenticated
using (
    exists (
        select 1
        from public.inspections i
        where i.id = inspection_id
        and i.inspector_id = auth.uid()
    )
);


-- ============================================================
-- EVIDENCE POLICIES
-- ============================================================

create policy "authenticated users can view evidence"
on public.inspection_evidence
for select
to authenticated
using (
    exists (
        select 1
        from public.inspections i
        where i.id = inspection_id
        and i.inspector_id = auth.uid()
    )
);


-- ============================================================
-- REPORT POLICIES
-- ============================================================

create policy "authenticated users can view reports"
on public.reports
for select
to authenticated
using (
    exists (
        select 1
        from public.inspections i
        where i.id = inspection_id
        and i.inspector_id = auth.uid()
    )
);


-- ============================================================
-- AUDIT LOG POLICIES
-- ============================================================

create policy "users can view own audit logs"
on public.audit_logs
for select
to authenticated
using (
    user_id = auth.uid()
);


-- ============================================================
-- 02 CONSUMER / PUBLIC USER PORTAL SCHEMA
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
    status TEXT DEFAULT 'NEW',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_consumer_scan_issues_status ON public.consumer_scan_issues(status);
CREATE INDEX IF NOT EXISTS idx_consumer_scan_issues_priority ON public.consumer_scan_issues(priority);
CREATE INDEX IF NOT EXISTS idx_consumer_scan_issues_created_at ON public.consumer_scan_issues(created_at DESC);

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
    status TEXT DEFAULT 'SUBMITTED',
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

ALTER TABLE public.consumer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_scan_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_issues ENABLE ROW LEVEL SECURITY;