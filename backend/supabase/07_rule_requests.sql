-- ============================================================
-- 07_RULE_REQUESTS.SQL
-- Migration: Inspector Statutory Rule Request & Notification System
-- ============================================================

create table if not exists public.rule_requests (
    id uuid primary key default gen_random_uuid(),
    inspector_id uuid not null references public.profiles(id) on delete cascade,
    rule_id uuid references public.compliance_rules(id) on delete set null,
    rule_code text,
    request_type text not null,
    subject text not null,
    description text not null,
    evidence_url text,
    status text not null default 'PENDING' check (status in (
        'PENDING',
        'UNDER_REVIEW',
        'RESOLVED',
        'REJECTED'
    )),
    admin_response text,
    reviewed_by uuid references public.profiles(id) on delete set null,
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for efficient querying and notification polling
create index if not exists idx_rule_requests_inspector on public.rule_requests(inspector_id);
create index if not exists idx_rule_requests_status on public.rule_requests(status);
create index if not exists idx_rule_requests_created_at on public.rule_requests(created_at desc);

-- Row Level Security (RLS)
alter table public.rule_requests enable row level security;

-- Policy: Inspectors can select their own requests
create policy "Inspectors can view own rule requests"
    on public.rule_requests
    for select
    using (auth.uid() = inspector_id);

-- Policy: Inspectors can insert their own requests
create policy "Inspectors can insert own rule requests"
    on public.rule_requests
    for insert
    with check (auth.uid() = inspector_id);

-- Policy: Admins can view all rule requests
create policy "Admins can view all rule requests"
    on public.rule_requests
    for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

-- Policy: Admins can update rule requests (resolution & response)
create policy "Admins can update rule requests"
    on public.rule_requests
    for update
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );
