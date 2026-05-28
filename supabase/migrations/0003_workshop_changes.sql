-- XYNQ CRM — post-workshop changes (15 May 2026 workshop debrief v1)
-- Run after 0001 and 0002. Idempotent-ish — uses IF NOT EXISTS where possible.

-- ============================================================================
-- New enums
-- ============================================================================
create type engine_pipe_enum as enum ('engine', 'pipe', 'both');
create type deal_track_enum as enum ('partnership', 'consulting', 'audit');
create type pricing_tier_enum as enum ('diagnostic', 'build', 'integrate', 'bespoke');

-- ============================================================================
-- Schema additions
-- ============================================================================
alter table companies
  add column engine_pipe engine_pipe_enum,
  add column mmf_member boolean not null default false,
  add column systems_fingerprint jsonb;

alter table deals
  add column track deal_track_enum,
  add column pricing_tier pricing_tier_enum;

alter table contacts
  add column is_advisor boolean not null default false,
  add column advisor_role text;

create index idx_companies_engine_pipe on companies (engine_pipe);
create index idx_deals_track on deals (track);
create index idx_contacts_is_advisor on contacts (is_advisor) where is_advisor;

-- ============================================================================
-- Backfill: engine/pipe classification for existing companies
-- Per workshop: ENGINES decision/process content; PIPES deliver to DSPs.
-- ============================================================================
update companies set engine_pipe = 'engine' where name in (
  'rightsHUB','Dallas Austin Distribution','Maxtreme','Afrisounds',
  'Genieboy Solution','MAD Solutions','Emubands','Africorii','Korda',
  'Mamba Sounds','Fulwell Entertainment'
);
update companies set engine_pipe = 'both' where name in ('Believe','Gamma/Vydia');
-- Creative UK, AIM, Edvance AI: trade bodies / commission partners — left null

-- ============================================================================
-- Backfill: deal tracks
-- Only set where the workshop framing makes it obvious. Leo classifies the rest.
-- ============================================================================
update deals d set track = 'partnership'
  from companies c
  where d.company_id = c.id and c.name in ('rightsHUB','Believe','Gamma/Vydia');

-- rightsHUB partnership has a bespoke tier
update deals d set pricing_tier = 'bespoke'
  from companies c
  where d.company_id = c.id and c.name = 'rightsHUB' and d.stage = 'partnership';

-- ============================================================================
-- Naming reset: Decision Certificate → Evidence Pack
-- Update prose where the term appears so future AI drafts use the new term.
-- ============================================================================
update companies
  set notes = 'Bootstrapped, ~1.5M tracks, MongoDB/GCP/DDEX stack. Lee independently described the Evidence Pack concept (originally called "Decision Certificate") on first call.'
  where name = 'rightsHUB';

update interactions
  set summary = 'First discovery call. Lee described the Evidence Pack concept (originally "Decision Certificate") independently. Agreed to receive product overview. Bootstrapped, ~1.5M tracks, MongoDB/GCP/DDEX stack.'
  where summary like '%Decision Certificate concept independently%';

-- Push the now-stale rightsHUB next action forward to reflect new positioning.
update deals d
  set next_action = 'Send product deck email with new positioning (Evidence Pack, governance automation framing)',
      next_action_due = date '2026-05-20'
  from companies c
  where d.company_id = c.id and c.name = 'rightsHUB' and d.stage = 'partnership';

-- ============================================================================
-- New tag: merlin_member added to MAD Solutions (already on Merlin board)
-- ============================================================================
update companies
  set tags = array_append(tags, 'merlin_member')
  where name = 'MAD Solutions' and not ('merlin_member' = any(tags));

-- ============================================================================
-- Merlin — strategic wedge, Charlie Lexton intro post-EDGE
-- ============================================================================
insert into companies (name, industry, sub_type, tags, engine_pipe, notes, icp_score, icp_score_breakdown) values
  ('Merlin', 'music', null,
   array['trade_body','priority','strategic_wedge','merlin_member'],
   null,
   'Strategic wedge into the distro network. Charlie Lexton (CEO) currently uses third-party audit services for new member vetting — XYNQ can become a paid audit provider as a faster wedge than mandate negotiation. If Merlin endorses ORIGIN + CTN, every distro in the network must integrate. Charlie intro is post-EDGE; warm via Edu.',
   10,
   '{"automated_content":3,"eu_market":2,"own_backend":2,"chokepoint":3,"volume":2,"funded":1,"music":1}'::jsonb);

insert into contacts (company_id, name, role, source, referred_by, is_primary, notes)
  select id, 'Charlie Lexton', 'CEO', 'referral', 'Eduard Castelló', true,
         'Pre-introduction. Already respects Leo. Edu makes the intro post-EDGE final (28 May). First conversation target: June.'
  from companies where name = 'Merlin';

insert into deals (company_id, deal_name, stage, status, track, pricing_tier,
                   deal_value, probability, next_action, next_action_due, notes)
  select id,
         'Merlin — Audit wedge / Charlie intro',
         'exposure_scan', 'active', 'audit', 'diagnostic',
         null, null,
         'Edu weekly call: confirm Charlie Lexton intro sequencing (post-EDGE)',
         date '2026-05-20',
         E'Sequencing:\n- 20 May: Edu weekly call — confirm intro sequencing\n- 28 May: EDGE final (credibility lever)\n- 29 May: Begin Charlie one-pager draft\n- 2 Jun: One-pager finalised, sent to Edu for sign-off\n- June: First Charlie conversation\n\nThesis: paid audit provider for new Merlin member vetting → builds Charlie relationship through delivery → mandate conversation comes later, warmer.'
  from companies where name = 'Merlin';

-- ============================================================================
-- XYNQ internal — hub for advisor contacts and internal task tracking
-- ============================================================================
insert into companies (name, industry, sub_type, tags, notes) values
  ('XYNQ', 'cross_sector', null,
   array['internal'],
   'Internal hub. Holds advisor contacts and XYNQ-internal task records (rate card, public assets, legal opinion scoping).');

-- Advisors (per workshop role assignments)
insert into contacts (company_id, name, role, source, is_advisor, advisor_role, is_primary)
  select id, 'Eduard Castelló', 'Advisor', 'direct', true,
         'Strategic positioning, Merlin and DSP introductions, naming and one-liner authority',
         false
  from companies where name = 'XYNQ';

insert into contacts (company_id, name, role, source, is_advisor, advisor_role, is_primary)
  select id, 'David Mogendorff', 'Advisor (Dmog)', 'direct', true,
         'Commercial, T&S, distro outbound, partnership commercials',
         false
  from companies where name = 'XYNQ';

insert into contacts (company_id, name, role, source, is_advisor, advisor_role, is_primary)
  select id, 'Anneliese Harmon', 'Advisor', 'direct', true,
         'Artist/manager lens, MMF network, speaking-gig pipeline',
         false
  from companies where name = 'XYNQ';

insert into contacts (company_id, name, role, source, is_advisor, advisor_role, is_primary)
  select id, 'Matthew Burrows', 'Advisor', 'direct', true,
         'Regulatory, Evidence Pack legal opinion, compliance framework for CTN',
         false
  from companies where name = 'XYNQ';

insert into contacts (company_id, name, role, source, is_advisor, advisor_role, is_primary)
  select id, 'Rachel Young', 'Advisor', 'direct', true,
         'Product strategy (bi-weekly product call), ICP systems mapping',
         false
  from companies where name = 'XYNQ';

-- CTO (team, not advisor)
insert into contacts (company_id, name, role, source, is_primary)
  select id, 'Ziyad Alrasbi', 'CTO', 'direct', true
  from companies where name = 'XYNQ';

-- ============================================================================
-- Internal deals for 14-day execution plan items not tied to other companies
-- ============================================================================
insert into deals (company_id, deal_name, stage, status, next_action, next_action_due, notes)
  select id, 'Pricing rate card — finalisation', 'policy_build', 'active',
         'Lock pricing tiers documented in rate card (Diagnostic £6K / Build £20K+ / Integrate £50K+ / 25% MMF discount)',
         date '2026-05-16',
         'Workshop decision: do not publish rate card publicly until 3 paid engagements have closed against it.'
  from companies where name = 'XYNQ';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due, notes)
  select id, 'Public assets refresh — Evidence Pack rollout', 'policy_build', 'active',
         'LinkedIn (company + personal), website, email signatures, pitch deck, one-pagers all on new positioning',
         date '2026-05-19',
         'Owner: Leo + Ziyad (website). New one-liner: "Governance automation for digital ecosystems". Tagline: "A better way to make decisions".'
  from companies where name = 'XYNQ';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due, notes)
  select id, 'Evidence Pack legal opinion (Matthew)', 'gap_analysis', 'active',
         'Weekly Matthew: scope Evidence Pack legal opinion',
         date '2026-05-22',
         'Foundational for the Evidence Pack liability framing. Matthew leads.'
  from companies where name = 'XYNQ';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due, notes)
  select id, 'ICP list build (27–35 distros)', 'exposure_scan', 'active',
         'Draft list ready for first Edu + Rachel walkthrough',
         date '2026-05-30',
         'Method: generate candidate list, walk through systems mapping with Edu + Rachel, one row per company with system fingerprint + integration shape + warmest path in. Full mapped tracker target: 13 June.'
  from companies where name = 'XYNQ';
