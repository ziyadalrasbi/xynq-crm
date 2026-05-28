import { createServiceClient } from '@/lib/supabase/server';
import { buildCompanyContext } from '../context';
import { cacheableSystem, runStructuredCall } from '../helpers';

export type TriageResult = {
  classification:
    | 'interested'
    | 'rejection'
    | 'scheduling'
    | 'referral'
    | 'cold_ask'
    | 'admin'
    | 'other';
  matched_company_id: string | null;
  matched_contact_id: string | null;
  summary: string;
  action_items: string[];
  follow_up_date: string | null;
  draft_reply: { subject: string; body: string };
  new_contacts: { name: string; role?: string; email?: string }[];
  new_referrals: { from: string; to: string; context: string }[];
};

/**
 * Triage a pasted inbound email. Two-step:
 *   1. Find any matching contact/company by sender email or quoted name
 *   2. Build the matched company's context (cached), then ask Claude to
 *      classify + summarise + draft reply + extract entities, with strict
 *      JSON output via tool_use.
 */
export async function triageEmail(opts: {
  rawEmail: string;
  fromEmail?: string;
}): Promise<TriageResult> {
  const supabase = createServiceClient();

  // Step 1: try to match by sender email
  let matchedCompanyId: string | null = null;
  let matchedContactId: string | null = null;
  let companyContext = '';

  if (opts.fromEmail) {
    const { data } = await supabase
      .from('contacts')
      .select('id, name, company_id, company:companies (id, name)')
      .ilike('email', opts.fromEmail.trim())
      .limit(1)
      .maybeSingle();
    if (data) {
      matchedContactId = data.id;
      matchedCompanyId = data.company_id;
    }
  }

  // Fallback: scan the email body for any known company name
  if (!matchedCompanyId) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name');
    const lowered = opts.rawEmail.toLowerCase();
    for (const c of companies ?? []) {
      if (lowered.includes(c.name.toLowerCase())) {
        matchedCompanyId = c.id;
        break;
      }
    }
  }

  if (matchedCompanyId) {
    companyContext = (await buildCompanyContext(matchedCompanyId)) ?? '';
  }

  const result = await runStructuredCall<Omit<TriageResult, 'matched_company_id' | 'matched_contact_id'>>({
    system: cacheableSystem(companyContext),
    messages: [
      {
        role: 'user',
        content: `Triage this inbound email. ${
          matchedCompanyId
            ? "I've matched it to the company in the context above. Use that context."
            : 'No matching company in the CRM — this might be a cold inbound.'
        }

${opts.fromEmail ? `From: ${opts.fromEmail}` : ''}

Raw email:
---
${opts.rawEmail}
---

Provide:
- classification: one of interested / rejection / scheduling / referral / cold_ask / admin / other
- summary: 1–2 sentence summary
- action_items: list of concrete next actions
- follow_up_date: YYYY-MM-DD if a specific deadline mentioned, else null
- draft_reply: a reply email in Leo's voice (short, direct, no fluff, "Evidence Pack" if relevant)
- new_contacts: people mentioned by name with their role + email (if visible)
- new_referrals: any intros offered ({from, to, context})

Today is ${new Date().toISOString().slice(0, 10)}.`,
      },
    ],
    tool: {
      name: 'triage_inbound_email',
      description: 'Classify and process an inbound email.',
      input_schema: {
        type: 'object',
        properties: {
          classification: {
            type: 'string',
            enum: ['interested', 'rejection', 'scheduling', 'referral', 'cold_ask', 'admin', 'other'],
          },
          summary: { type: 'string' },
          action_items: { type: 'array', items: { type: 'string' } },
          follow_up_date: { type: ['string', 'null'] },
          draft_reply: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['subject', 'body'],
          },
          new_contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                role: { type: 'string' },
                email: { type: 'string' },
              },
              required: ['name'],
            },
          },
          new_referrals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                context: { type: 'string' },
              },
              required: ['from', 'to', 'context'],
            },
          },
        },
        required: [
          'classification',
          'summary',
          'action_items',
          'follow_up_date',
          'draft_reply',
          'new_contacts',
          'new_referrals',
        ],
      },
    },
    max_tokens: 2048,
    effort: 'medium',
    thinking: true,
  });

  return {
    ...result,
    matched_company_id: matchedCompanyId,
    matched_contact_id: matchedContactId,
  };
}
