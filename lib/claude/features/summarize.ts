import { cacheableSystem, runStructuredCall } from '../helpers';

export type SummarizedInteraction = {
  summary: string;
  action_items: string[];
  follow_up_date: string | null;
  contacts_mentioned: string[];
  referrals_mentioned: { from: string; to: string; context: string }[];
};

/**
 * Take raw notes / call transcript and extract a clean summary + action items.
 * No company context needed — operates on the raw text the user pasted.
 */
export async function summarizeInteraction(opts: {
  rawText: string;
  companyName?: string;
}): Promise<SummarizedInteraction> {
  const context = opts.companyName
    ? `The notes are about a conversation with ${opts.companyName}.`
    : '';

  const today = new Date().toISOString().slice(0, 10);

  return runStructuredCall<SummarizedInteraction>({
    system: cacheableSystem(context),
    messages: [
      {
        role: 'user',
        content: `Extract structured data from these raw notes / call transcript. Today is ${today}.

Raw notes:
---
${opts.rawText}
---

Rules:
- summary: 2–3 sentence clean summary in past tense
- action_items: list of concrete next actions mentioned
- follow_up_date: if a specific date or deadline was mentioned, return it as YYYY-MM-DD. Otherwise null.
- contacts_mentioned: people mentioned by name (first + last where given)
- referrals_mentioned: any offers to make intros — each as {from: who offered, to: company or person, context: why}`,
      },
    ],
    tool: {
      name: 'extract_interaction',
      description: 'Extract structured fields from raw call notes or transcript.',
      input_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          action_items: { type: 'array', items: { type: 'string' } },
          follow_up_date: { type: ['string', 'null'] },
          contacts_mentioned: { type: 'array', items: { type: 'string' } },
          referrals_mentioned: {
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
        required: ['summary', 'action_items', 'follow_up_date', 'contacts_mentioned', 'referrals_mentioned'],
      },
    },
    max_tokens: 1500,
    effort: 'low',
  });
}
