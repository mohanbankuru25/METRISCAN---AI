-- ============================================================
-- SIH-G / METRISCAN
-- AUTHENTICATION + DYNAMIC COMPLIANCE RULES
--
-- This upgrades the EXISTING schema.
-- It does NOT recreate products/inspections/etc.
-- ============================================================


-- ============================================================
-- 1. ADD USERNAME TO EXISTING PROFILES TABLE
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;


-- ============================================================
-- 2. MAKE USERNAME UNIQUE
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
idx_profiles_username_unique
ON public.profiles(username)
WHERE username IS NOT NULL;


-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_profiles_role
ON public.profiles(role);

CREATE INDEX IF NOT EXISTS
idx_profiles_active
ON public.profiles(is_active);


-- ============================================================
-- 4. DYNAMIC COMPLIANCE RULES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.compliance_rules (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    rule_code TEXT NOT NULL UNIQUE,

    rule_name TEXT NOT NULL,

    description TEXT,

    category TEXT,

    field_name TEXT,

    condition_type TEXT NOT NULL,

    expected_value TEXT,

    operator TEXT,

    severity TEXT NOT NULL DEFAULT 'MEDIUM'
        CHECK (
            severity IN (
                'LOW',
                'MEDIUM',
                'HIGH',
                'CRITICAL'
            )
        ),

    mandatory BOOLEAN NOT NULL DEFAULT TRUE,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    effective_from DATE,

    effective_to DATE,

    created_by UUID
        REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 5. RULE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_compliance_rules_active
ON public.compliance_rules(active);

CREATE INDEX IF NOT EXISTS
idx_compliance_rules_field
ON public.compliance_rules(field_name);

CREATE INDEX IF NOT EXISTS
idx_compliance_rules_category
ON public.compliance_rules(category);


-- ============================================================
-- 6. UPDATE TIMESTAMP FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- ============================================================
-- 7. PROFILE UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS profiles_updated_at
ON public.profiles;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 8. RULE UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS compliance_rules_updated_at
ON public.compliance_rules;

CREATE TRIGGER compliance_rules_updated_at
BEFORE UPDATE ON public.compliance_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 9. ENABLE RLS ON RULES
-- ============================================================

ALTER TABLE public.compliance_rules
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 10. HELPER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
    AND is_active = TRUE
    LIMIT 1;
$$;


-- ============================================================
-- 11. USERS CAN VIEW THEIR OWN PROFILE
-- ============================================================

DROP POLICY IF EXISTS
"users can view own profile"
ON public.profiles;

CREATE POLICY
"users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
);


-- ============================================================
-- 12. ADMIN CAN VIEW ALL PROFILES
-- ============================================================

DROP POLICY IF EXISTS
"admins can view all profiles"
ON public.profiles;

CREATE POLICY
"admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.current_user_role() = 'admin'
);


-- ============================================================
-- 13. ADMIN CAN UPDATE PROFILES
-- ============================================================

DROP POLICY IF EXISTS
"admins can update profiles"
ON public.profiles;

CREATE POLICY
"admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    public.current_user_role() = 'admin'
)
WITH CHECK (
    public.current_user_role() = 'admin'
);


-- ============================================================
-- 14. AUTHENTICATED USERS CAN READ ACTIVE RULES
-- ============================================================

DROP POLICY IF EXISTS
"authenticated users can read active rules"
ON public.compliance_rules;

CREATE POLICY
"authenticated users can read active rules"
ON public.compliance_rules
FOR SELECT
TO authenticated
USING (
    active = TRUE
);


-- ============================================================
-- 15. ADMIN CAN READ ALL RULES
-- ============================================================

DROP POLICY IF EXISTS
"admins can view all rules"
ON public.compliance_rules;

CREATE POLICY
"admins can view all rules"
ON public.compliance_rules
FOR SELECT
TO authenticated
USING (
    public.current_user_role() = 'admin'
);


-- ============================================================
-- 16. ADMIN CAN CREATE RULES
-- ============================================================

DROP POLICY IF EXISTS
"admins can insert rules"
ON public.compliance_rules;

CREATE POLICY
"admins can insert rules"
ON public.compliance_rules
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_role() = 'admin'
);


-- ============================================================
-- 17. ADMIN CAN UPDATE RULES
-- ============================================================

DROP POLICY IF EXISTS
"admins can update rules"
ON public.compliance_rules;

CREATE POLICY
"admins can update rules"
ON public.compliance_rules
FOR UPDATE
TO authenticated
USING (
    public.current_user_role() = 'admin'
)
WITH CHECK (
    public.current_user_role() = 'admin'
);


-- ============================================================
-- 18. ADMIN CAN DELETE RULES
--
-- We will normally use active=false instead of deleting,
-- but this policy is included for controlled administration.
-- ============================================================

DROP POLICY IF EXISTS
"admins can delete rules"
ON public.compliance_rules;

CREATE POLICY
"admins can delete rules"
ON public.compliance_rules
FOR DELETE
TO authenticated
USING (
    public.current_user_role() = 'admin'
);


-- ============================================================
-- 19. AUDIT LOG
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_audit_logs_user
ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS
idx_audit_logs_created
ON public.audit_logs(created_at DESC);


-- ============================================================
-- COMPLETE
-- ============================================================