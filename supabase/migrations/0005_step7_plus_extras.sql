-- XYNQ CRM — step 7 + 4 revolutionary additions
-- Adds: share_tokens (advisor share links), ai_drafts (auto-generated follow-ups),
-- chat_conversations + chat_messages (conversational agent).
-- Run after 0001–0004.

-- ============================================================================
-- Enums
-- ============================================================================
create type ai_draft_status_enum as enum ('pending', 'approved', 'dismissed');
create type chat_role_enum as enum ('user', 'assistant');

-- ============================================================================
-- Share tokens — signed read-only access for advisors
-- ============================================================================
create table share_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  label text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_accessed_at timestamptz
);
create index idx_share_tokens_token on share_tokens (token) where revoked_at is null;

alter table share_tokens enable row level security;
create policy "auth all" on share_tokens for all to authenticated using (true) with check (true);
-- Public read for active tokens (used by the unauthenticated /share/[token] route)
create policy "public read active" on share_tokens for select to anon
  using (revoked_at is null);

-- ============================================================================
-- AI drafts — auto-generated follow-up emails awaiting Leo's approval
-- ============================================================================
create table ai_drafts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  subject text,
  body text,
  status ai_draft_status_enum not null default 'pending',
  generated_at timestamptz not null default now(),
  approved_at timestamptz,
  dismissed_at timestamptz,
  notes text
);
create index idx_ai_drafts_status on ai_drafts (status);
create index idx_ai_drafts_company on ai_drafts (company_id);
create index idx_ai_drafts_deal_pending on ai_drafts (deal_id) where status = 'pending';

alter table ai_drafts enable row level security;
create policy "auth all" on ai_drafts for all to authenticated using (true) with check (true);

-- ============================================================================
-- Chat conversations + messages
-- ============================================================================
create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_chat_conversations_updated on chat_conversations (updated_at desc);

create trigger chat_conversations_set_updated_at before update on chat_conversations
  for each row execute function set_updated_at();

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations (id) on delete cascade,
  role chat_role_enum not null,
  content jsonb not null,  -- array of Anthropic content blocks
  created_at timestamptz not null default now()
);
create index idx_chat_messages_conversation on chat_messages (conversation_id, created_at);

alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;
create policy "auth all" on chat_conversations for all to authenticated using (true) with check (true);
create policy "auth all" on chat_messages for all to authenticated using (true) with check (true);
