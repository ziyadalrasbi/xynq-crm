-- XYNQ CRM — seed data
-- Run after 0001_initial_schema.sql.
-- Idempotency: this assumes an empty database. If you re-run, truncate first:
--   truncate table sequence_emails, email_sequences, relationships, referrals,
--                  interactions, deals, contacts, competitors, companies cascade;

-- ============================================================================
-- Competitors (preload)
-- ============================================================================
insert into competitors (name, description, overlap, weakness, source) values
  ('Beatdapp',
   'Streaming fraud detection',
   'Detection layer in music streaming',
   'No certificates, no regulation layer — detection only',
   'preload'),
  ('Pex',
   'Fingerprinting / Content ID',
   'Content identification',
   'Fingerprinting only, no compliance certificates — potential vendor not competitor',
   'preload'),
  ('Vobile',
   'Rights management platform',
   'Enterprise rights detection',
   'Enterprise only, no AI Act compliance posture',
   'preload'),
  ('Audible Magic',
   'Audio fingerprinting',
   'Content identification',
   'Fingerprinting only — potential vendor not competitor',
   'preload'),
  ('SubmitHub',
   'Music discovery platform with HSVerify add-on',
   'AI detection bolt-on (HSVerify)',
   'Discovery first, detection bolt-on — not a compliance posture',
   'preload'),
  ('C2PA',
   'Content provenance standard (not a company)',
   'Provenance / content signing',
   'Standard, not a company — complementary to XYNQ, not competing',
   'preload');

-- ============================================================================
-- Companies
-- ============================================================================
insert into companies (name, industry, sub_type, tags, notes, icp_score, icp_score_breakdown) values
  ('rightsHUB', 'music', 'Non-DIY+Own Backend',
   array['rights_platform','partnership','priority'],
   'Bootstrapped, ~1.5M tracks, MongoDB/GCP/DDEX stack. Lee independently described Decision Certificate concept on first call.',
   10,
   '{"automated_content":3,"eu_market":2,"own_backend":2,"chokepoint":3,"volume":2,"funded":0,"music":1}'::jsonb),

  ('Dallas Austin Distribution', 'music', 'Non-DIY+No Backend',
   array['distributor'],
   'Moving off Vydia.',
   null, null),

  ('Maxtreme', 'music', 'DIY+No Backend',
   array['distributor','african_market'],
   null, null, null),

  ('Afrisounds', 'music', 'DIY+No Backend',
   array['distributor','african_market'],
   null, null, null),

  ('Genieboy Solution', 'music', 'Inactive',
   array['distributor'],
   'CEO providing feedback.',
   null, null),

  ('MAD Solutions', 'music', 'Non-DIY+No Backend',
   array['distributor','merlin_board'],
   'Stalled — Type 1 transition in progress.',
   null, null),

  ('Emubands', 'music', 'DIY+No Backend',
   array['distributor'],
   'Sarah is gatekeeper, Ally is decision maker.',
   null, null),

  ('Believe', 'music', 'DIY+Own Backend',
   array['enterprise','distributor','priority'],
   'Edu managing C-suite review — DO NOT approach directly.',
   10,
   '{"automated_content":3,"eu_market":2,"own_backend":2,"chokepoint":3,"volume":2,"funded":1,"music":1}'::jsonb),

  ('Africorii', 'music', 'Non-DIY+No Backend',
   array['distributor','african_market','wmg_signed'],
   null, null, null),

  ('Korda', 'music', 'DIY+No Backend',
   array['distributor'],
   'Backend through upstream distributor limits integration.',
   null, null),

  ('Gamma/Vydia', 'music', 'DIY+Own Backend',
   array['distributor','enterprise'],
   'Pitch ORIGIN as detection and evidence layer.',
   null, null),

  ('Creative UK', 'cross_sector', null,
   array['trade_body','partnership','priority'],
   null, null, null),

  ('AIM', 'music', null,
   array['trade_body'],
   'Lee Morrison referral — anti-piracy angle.',
   null, null),

  ('Mamba Sounds', 'music', 'DIY+No Backend',
   array['internal','case_study'],
   'Internal — used as case study for gap analysis.',
   null, null),

  ('Edvance AI', 'cross_sector', null,
   array['connector','commission_partner'],
   null, null, null),

  ('Fulwell Entertainment', 'film_vfx', null,
   array['content_provenance'],
   'Thummy content provenance project — re-engage when timing right.',
   null, null);

-- ============================================================================
-- Contacts
-- ============================================================================
insert into contacts (company_id, name, role, source, is_primary)
  select id, 'Lee Morrison', 'CEO', 'direct', true from companies where name = 'rightsHUB';

insert into contacts (company_id, name, role, source, is_primary)
  select id, 'Bugwu', 'CEO', 'direct', true from companies where name = 'MAD Solutions';

insert into contacts (company_id, name, role, source, is_primary)
  select id, 'Sarah', 'Gatekeeper', 'cold_outreach', false from companies where name = 'Emubands';

insert into contacts (company_id, name, role, source, is_primary)
  select id, 'Ally', 'Decision maker', 'cold_outreach', true from companies where name = 'Emubands';

insert into contacts (company_id, name, role, source, referred_by, is_primary)
  select id, 'Luxi Huang', 'CTO', 'referral', 'Edu Castelló', true from companies where name = 'Believe';

insert into contacts (company_id, name, role, source, is_primary)
  select id, 'Harry Gault', 'Policy & Public Affairs Manager', 'direct', true from companies where name = 'Creative UK';

insert into contacts (company_id, name, role, source, is_primary)
  select id, 'Ideja', null, 'direct', true from companies where name = 'Edvance AI';

insert into contacts (company_id, name, role, source, is_primary)
  select id, 'Sheldon Lazarus', null, 'direct', true from companies where name = 'Fulwell Entertainment';

-- ============================================================================
-- Deals
-- ============================================================================
insert into deals (company_id, deal_name, stage, status, deal_value, next_action, next_action_due)
  select id, 'rightsHUB Partnership', 'partnership', 'active', 5000,
         'Send product deck email', date '2026-05-08'
  from companies where name = 'rightsHUB';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Dallas Austin — Pipeline', 'exposure_scan', 'active',
         'Follow up — moving off Vydia', date '2026-04-15'
  from companies where name = 'Dallas Austin Distribution';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Maxtreme — Pipeline', 'exposure_scan', 'active',
         'WhatsApp outreach', date '2026-04-15'
  from companies where name = 'Maxtreme';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Afrisounds — Pipeline', 'exposure_scan', 'active',
         'WhatsApp outreach', date '2026-04-15'
  from companies where name = 'Afrisounds';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Genieboy — Pipeline', 'exposure_scan', 'paused',
         'CEO providing feedback', date '2026-04-20'
  from companies where name = 'Genieboy Solution';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'MAD Solutions — Pipeline', 'exposure_scan', 'stalled',
         'Re-engage when Type 1 transition complete', date '2026-06-01'
  from companies where name = 'MAD Solutions';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Emubands — Pipeline', 'exposure_scan', 'stalled',
         'Follow up past Sarah', date '2026-04-20'
  from companies where name = 'Emubands';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Believe — Pipeline', 'exposure_scan', 'active',
         'Edu managing C-suite review — do not approach directly', date '2026-05-15'
  from companies where name = 'Believe';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Africorii — Pipeline', 'exposure_scan', 'stalled',
         'WhatsApp outreach', date '2026-04-20'
  from companies where name = 'Africorii';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Korda — Pipeline', 'exposure_scan', 'active',
         'Monitor — backend through upstream distributor limits integration', date '2026-05-01'
  from companies where name = 'Korda';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Gamma/Vydia — Pipeline', 'exposure_scan', 'active',
         'Pitch ORIGIN as detection and evidence layer — frame upward from what Dallas Austin liked',
         date '2026-04-20'
  from companies where name = 'Gamma/Vydia';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Creative UK — Partnership', 'exposure_scan', 'active',
         'Send outreach email to Harry Gault', date '2026-05-12'
  from companies where name = 'Creative UK';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'AIM — Trade body engagement', 'exposure_scan', 'active',
         'Reach out re anti-piracy — Lee Morrison referral', date '2026-05-13'
  from companies where name = 'AIM';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Mamba Sounds — Internal case study', 'gap_analysis', 'active',
         'Run through gap analysis as case study', date '2026-04-20'
  from companies where name = 'Mamba Sounds';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Edvance AI — Pipeline', 'exposure_scan', 'active',
         'Call scheduled', null
  from companies where name = 'Edvance AI';

insert into deals (company_id, deal_name, stage, status, next_action, next_action_due)
  select id, 'Fulwell — Thummy content provenance', 'exposure_scan', 'paused',
         'Thummy content provenance project — re-engage when timing right', null
  from companies where name = 'Fulwell Entertainment';

-- ============================================================================
-- Interactions (rightsHUB has logged calls)
-- ============================================================================
insert into interactions (company_id, contact_id, deal_id, type, summary, date)
select co.id, ct.id, d.id,
       'call'::interaction_type_enum,
       'First discovery call. Lee described Decision Certificate concept independently. Agreed to receive product overview. Bootstrapped, ~1.5M tracks, MongoDB/GCP/DDEX stack.',
       timestamptz '2026-04-07 14:00:00+00'
from companies co
join contacts ct on ct.company_id = co.id and ct.name = 'Lee Morrison'
join deals d on d.company_id = co.id
where co.name = 'rightsHUB';

insert into interactions (company_id, contact_id, deal_id, type, summary, date)
select co.id, ct.id, d.id,
       'call'::interaction_type_enum,
       'Follow-up call. Lee agreed to CTO call, free gap analysis, offered Pex and AIM intros. Called regulation layer concept "so fucking clever". Tech stack confirmed: MongoDB, GCP, EasyTo, DDEX.',
       timestamptz '2026-04-14 14:00:00+00'
from companies co
join contacts ct on ct.company_id = co.id and ct.name = 'Lee Morrison'
join deals d on d.company_id = co.id
where co.name = 'rightsHUB';

-- ============================================================================
-- Referrals (Lee Morrison → Pex, AIM)
-- ============================================================================
insert into referrals (from_contact_id, to_company, to_contact_name, context, status, date)
select id, 'Pex', 'Larry',
       'Lee offered intro to Pex CEO during follow-up call',
       'offered', timestamptz '2026-04-14 14:00:00+00'
from contacts where name = 'Lee Morrison';

insert into referrals (from_contact_id, to_company, context, status, date)
select id, 'AIM',
       'Lee offered intro re anti-piracy angle',
       'offered', timestamptz '2026-04-14 14:00:00+00'
from contacts where name = 'Lee Morrison';
