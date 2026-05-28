# Supabase migrations

Run in the Supabase SQL Editor in order:

1. `migrations/0001_initial_schema.sql` — enums, tables, indexes, triggers, RLS
2. `migrations/0002_seed_data.sql` — competitors and pipeline seed data
3. `migrations/0003_workshop_changes.sql` — post-15-May-2026 workshop:
   adds `engine_pipe`, `mmf_member`, `systems_fingerprint` on companies;
   `track`, `pricing_tier` on deals; `is_advisor`, `advisor_role` on contacts.
   Backfills engine/pipe classification on existing distros, renames
   Decision Certificate → Evidence Pack in rightsHUB notes/interactions,
   seeds Merlin + Charlie Lexton + XYNQ-internal advisors + four 14-day
   plan action items.

After running, regenerate TS types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
```

## Notes on dates

Seed data dates are pegged to early-May 2026 so the dashboard shows realistic
overdue / due-today / due-this-week buckets out of the box:

- Today (2026-05-08): rightsHUB
- This week: Creative UK (5/12), AIM (5/13), Believe (5/15)
- Overdue: April action items (Dallas Austin, Maxtreme, Afrisounds, Genieboy,
  Emubands, Africorii, Korda, Gamma/Vydia, Mamba Sounds)
- Future: MAD Solutions (6/1)
- TBC: Edvance AI, Fulwell Entertainment

Update the dates after seeding if today is no longer 2026-05-08.

## Re-seeding

The seed file assumes an empty database. To re-run:

```sql
truncate table sequence_emails, email_sequences, relationships, referrals,
               interactions, deals, contacts, competitors, companies cascade;
```
