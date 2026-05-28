-- XYNQ CRM — step 6 additions (sequences + meeting prep + weekly digest)
-- Run after 0001–0003.

-- ============================================================================
-- Meeting prep — store the latest auto-generated brief per deal as jsonb so
-- it can be re-generated and overwritten cheaply.
-- Shape: { generated_at: timestamp, brief: text }
-- ============================================================================
alter table deals
  add column meeting_prep jsonb;

-- ============================================================================
-- Sequence emails: small indexes to make the cron's "what needs a draft now"
-- query cheap.
-- ============================================================================
create index idx_sequence_emails_scheduled on sequence_emails (scheduled_date)
  where status = 'draft';
