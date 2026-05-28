'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SaveTriagePayload = {
  matched_company_id: string | null;
  matched_contact_id: string | null;
  summary: string;
  follow_up_date: string | null;
  new_contacts: { name: string; role?: string; email?: string; add: boolean }[];
  new_referrals: { from: string; to: string; context: string; add: boolean }[];
};

/**
 * Persist the triage outcome: log an email_received interaction (if a company
 * matched), add approved new contacts (under the matched company), and
 * create approved referrals (from matched contact, if any).
 */
export async function saveTriageOutcome(payload: SaveTriagePayload) {
  if (!payload.matched_company_id) {
    throw new Error('Cannot save: no matching company. Create the company first.');
  }
  const supabase = createClient();

  // 1. Log the interaction
  await supabase.from('interactions').insert({
    company_id: payload.matched_company_id,
    contact_id: payload.matched_contact_id,
    type: 'email_received',
    summary: payload.summary,
    date: new Date().toISOString(),
    follow_up_needed: !!payload.follow_up_date,
    follow_up_date: payload.follow_up_date,
  });

  // 2. Add approved new contacts
  const contactsToAdd = payload.new_contacts.filter((c) => c.add && c.name.trim());
  if (contactsToAdd.length > 0) {
    await supabase.from('contacts').insert(
      contactsToAdd.map((c) => ({
        company_id: payload.matched_company_id!,
        name: c.name,
        role: c.role ?? null,
        email: c.email ?? null,
        source: 'inbound',
      })),
    );
  }

  // 3. Add referrals (only if we have a from_contact)
  const referralsToAdd = payload.new_referrals.filter((r) => r.add && r.from && r.to);
  if (referralsToAdd.length > 0 && payload.matched_contact_id) {
    await supabase.from('referrals').insert(
      referralsToAdd.map((r) => ({
        from_contact_id: payload.matched_contact_id!,
        to_company: r.to,
        context: r.context,
        status: 'offered',
      })),
    );
  }

  revalidatePath('/triage');
  revalidatePath(`/companies/${payload.matched_company_id}`);
  revalidatePath('/inbox');
  revalidatePath('/referrals');
}
