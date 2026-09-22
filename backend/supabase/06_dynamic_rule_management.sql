-- ============================================================
-- METRISCAN / SIH-G
-- DYNAMIC RULE MANAGEMENT & COMPLIANCE CONFIGURATION MIGRATION
-- Migration: 06_dynamic_rule_management.sql
-- ============================================================

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. RULE DOCUMENTS TABLE
-- Stores uploaded statutory PDFs and rule documents
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rule_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    document_version TEXT DEFAULT '1.0',
    extraction_status TEXT NOT NULL DEFAULT 'PROCESSED'
        CHECK (extraction_status IN ('PENDING', 'PROCESSED', 'FAILED')),
    uploaded_by UUID REFERENCES public.profiles(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_text TEXT,
    rules_count INT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rule_documents_uploaded_at
ON public.rule_documents(uploaded_at DESC);

-- ============================================================
-- 2. UPGRADE COMPLIANCE RULES TABLE WITH EXTENDED METADATA
-- ============================================================

ALTER TABLE public.compliance_rules
    ADD COLUMN IF NOT EXISTS rule_number TEXT,
    ADD COLUMN IF NOT EXISTS requirement TEXT,
    ADD COLUMN IF NOT EXISTS applicability TEXT,
    ADD COLUMN IF NOT EXISTS expected_condition TEXT,
    ADD COLUMN IF NOT EXISTS evidence_required JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS automation_type TEXT DEFAULT 'AUTOMATED',
    ADD COLUMN IF NOT EXISTS legal_act TEXT DEFAULT 'Legal Metrology (Packaged Commodities) Rules, 2011',
    ADD COLUMN IF NOT EXISTS statutory_reference TEXT,
    ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES public.rule_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_document_name TEXT,
    ADD COLUMN IF NOT EXISTS source_page INT,
    ADD COLUMN IF NOT EXISTS extraction_confidence TEXT DEFAULT 'HIGH',
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure severity constraint allows standard values
ALTER TABLE public.compliance_rules
    DROP CONSTRAINT IF EXISTS compliance_rules_severity_check;

ALTER TABLE public.compliance_rules
    ADD CONSTRAINT compliance_rules_severity_check
    CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'MANDATORY', 'WARNING', 'OPTIONAL'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_rules_status
ON public.compliance_rules(status);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_is_deleted
ON public.compliance_rules(is_deleted);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_rule_number
ON public.compliance_rules(rule_number);

-- ============================================================
-- 3. RLS POLICIES FOR RULE DOCUMENTS & RULES
-- ============================================================

ALTER TABLE public.rule_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins can manage rule documents" ON public.rule_documents;
CREATE POLICY "admins can manage rule documents"
ON public.rule_documents
FOR ALL
TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

-- Completed migration 06
