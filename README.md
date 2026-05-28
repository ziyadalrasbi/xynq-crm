# XYNQ CRM

Single-user sales pipeline for XYNQ. Next.js 14 + Supabase + Claude.

## Setup

1. `npm install`
2. Create a Supabase project at https://supabase.com
3. Copy `.env.example` → `.env.local` and fill in keys
4. In the Supabase SQL editor, run migrations in order:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_seed_data.sql`
   - `supabase/migrations/0003_workshop_changes.sql` (post-15-May-2026 workshop)
   - `supabase/migrations/0004_step6_additions.sql` (meeting_prep column)
5. (Optional) Regenerate typed schema:
   `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts`
6. `npm run dev`

## Stack

- Next.js 14 (App Router)
- Supabase (Postgres + auth + realtime)
- Tailwind CSS
- Claude API — `claude-sonnet-4-6`
- Resend (email — drafts only, never auto-sent)
- Vercel (deploy)

## Status

- [x] Step 1 — scaffold
- [x] Step 2 — schema + seed
- [x] Step 2.5 — post-workshop schema additions (tracks, tiers, engine/pipe, advisors, Merlin, XYNQ internal)
- [x] Step 3 — core pages (dashboard, pipeline, company detail, add company)
- [x] Step 4 — AI features (draft email, suggest action, summarize, score ICP, auto-research, suggest stage, smart tags, check competitors)
- [x] Step 5 — directories (contacts), referrals tracker, intelligence feed
- [x] Step 6 — sequences, meeting prep, weekly digest (cron via Vercel)
- [ ] Step 7 — advisor share link
- [ ] v2 — Gmail integration
