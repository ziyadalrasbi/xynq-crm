-- XYNQ CRM — initial schema
-- Run this in the Supabase SQL editor before 0002_seed_data.sql.

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- Enums
-- ============================================================================
create type industry_enum as enum (
  'music',
  'film_vfx',
  'gaming',
  'publishing',
  'advertising',
  'cross_sector'
);

create type deal_stage_enum as enum (
  'exposure_scan',
  'gap_analysis',
  'policy_build',
  'origin_integration',
  'retainer',
  'partnership'
);

create type deal_status_enum as enum (
  'active',
  'stalled',
  'won',
  'lost',
  'paused'
);

create type interaction_type_enum as enum (
  'call',
  'email_sent',
  'email_received',
  'meeting',
  'whatsapp',
  'linkedin',
  'note',
  'intro_received',
  'intro_made'
);

create type referral_status_enum as enum (
  'offered',
  'accepted',
  'intro_made',
  'converted',
  'dead'
);

create type relationship_type_enum as enum (
  'advisor',
  'investor',
  'referral',
  'colleague',
  'warm_intro',
  'cold_intro'
);

create type sequence_status_enum as enum (
  'active',
  'paused',
  'completed'
);

create type sequence_email_status_enum as enum (
  'draft',
  'approved',
  'sent',
  'skipped'
);

-- ============================================================================
-- Tables
-- ============================================================================

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry industry_enum not null,
  sub_type text,
  tags text[] not null default '{}',
  website text,
  notes text,
  icp_score integer check (icp_score is null or icp_score between 0 and 10),
  icp_score_breakdown jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_companies_industry on companies (industry);
create index idx_companies_tags on companies using gin (tags);
create index idx_companies_name_lower on companies (lower(name));

create table competitors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  overlap text,
  weakness text,
  source text,
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  linkedin text,
  is_primary boolean not null default false,
  source text,
  referred_by text,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_contacts_company on contacts (company_id);
create index idx_contacts_email on contacts (lower(email));
create index idx_contacts_referred_by on contacts (referred_by);

create table deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  deal_name text not null,
  stage deal_stage_enum not null default 'exposure_scan',
  status deal_status_enum not null default 'active',
  deal_value integer,
  probability integer check (probability is null or probability between 0 and 100),
  expected_close_date date,
  next_action text,
  next_action_due date,
  owner text not null default 'Leo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_deals_company on deals (company_id);
create index idx_deals_stage on deals (stage);
create index idx_deals_status on deals (status);
create index idx_deals_next_action_due on deals (next_action_due);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  deal_id uuid references deals (id) on delete set null,
  type interaction_type_enum not null,
  summary text not null,
  date timestamptz not null default now(),
  follow_up_needed boolean not null default false,
  follow_up_date date,
  created_at timestamptz not null default now()
);
create index idx_interactions_company on interactions (company_id);
create index idx_interactions_date on interactions (date desc);
create index idx_interactions_deal on interactions (deal_id);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  from_contact_id uuid not null references contacts (id) on delete cascade,
  to_company text not null,
  to_contact_name text,
  to_contact_email text,
  context text,
  status referral_status_enum not null default 'offered',
  date timestamptz not null default now(),
  notes text
);
create index idx_referrals_from on referrals (from_contact_id);
create index idx_referrals_status on referrals (status);

create table relationships (
  id uuid primary key default gen_random_uuid(),
  from_contact_id uuid not null references contacts (id) on delete cascade,
  to_contact_id uuid not null references contacts (id) on delete cascade,
  relationship_type relationship_type_enum not null,
  notes text,
  created_at timestamptz not null default now(),
  check (from_contact_id <> to_contact_id),
  unique (from_contact_id, to_contact_id, relationship_type)
);
create index idx_relationships_from on relationships (from_contact_id);
create index idx_relationships_to on relationships (to_contact_id);

create table email_sequences (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals (id) on delete cascade,
  template_name text not null,
  current_step integer not null default 0,
  next_send_date date,
  status sequence_status_enum not null default 'active',
  created_at timestamptz not null default now()
);
create index idx_sequences_deal on email_sequences (deal_id);
create index idx_sequences_next_send on email_sequences (next_send_date) where status = 'active';

create table sequence_emails (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references email_sequences (id) on delete cascade,
  step_number integer not null,
  subject text,
  body text,
  status sequence_email_status_enum not null default 'draft',
  scheduled_date date,
  sent_date timestamptz,
  unique (sequence_id, step_number)
);
create index idx_sequence_emails_status on sequence_emails (status);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger companies_set_updated_at before update on companies
  for each row execute function set_updated_at();

create trigger deals_set_updated_at before update on deals
  for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security
-- Single-user app — any authenticated session has full access.
-- (When you add team members later, tighten these policies.)
-- ============================================================================
alter table companies         enable row level security;
alter table contacts          enable row level security;
alter table deals             enable row level security;
alter table interactions      enable row level security;
alter table referrals         enable row level security;
alter table relationships     enable row level security;
alter table competitors       enable row level security;
alter table email_sequences   enable row level security;
alter table sequence_emails   enable row level security;

create policy "auth all" on companies        for all to authenticated using (true) with check (true);
create policy "auth all" on contacts         for all to authenticated using (true) with check (true);
create policy "auth all" on deals            for all to authenticated using (true) with check (true);
create policy "auth all" on interactions     for all to authenticated using (true) with check (true);
create policy "auth all" on referrals        for all to authenticated using (true) with check (true);
create policy "auth all" on relationships    for all to authenticated using (true) with check (true);
create policy "auth all" on competitors      for all to authenticated using (true) with check (true);
create policy "auth all" on email_sequences  for all to authenticated using (true) with check (true);
create policy "auth all" on sequence_emails  for all to authenticated using (true) with check (true);
