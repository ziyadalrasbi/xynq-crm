import { buildCompanyContext } from '../context';
import { cacheableSystem, runStructuredCall } from '../helpers';

export type SuggestedAction = {
  action: string;
  due_date: string; // YYYY-MM-DD
  reasoning: string;
  suggested_track?: 'partnership' | 'consulting' | 'audit';
};

export async function suggestNextAction(opts: {
  companyId: string;
}): Promise<SuggestedAction> {
  const context = await buildCompanyContext(opts.companyId);
  if (!context) throw new Error('Company not found');

  const today = new Date().toISOString().slice(0, 10);

  return runStructuredCall<SuggestedAction>({
    system: cacheableSystem(context),
    messages: [
      {
        role: 'user',
        content: `Based on this prospect's current stage, last interaction, and the partnership/consulting/audit track distinctions, what should Leo do next?

Today is ${today}. Suggest ONE specific next action with a realistic due date (typically 1–14 days out, never in the past).`,
      },
    ],
    tool: {
      name: 'suggest_next_action',
      description: 'Return a single concrete next action with a suggested due date.',
      input_schema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'A single specific action. Imperative voice. Under 140 chars.',
          },
          due_date: {
            type: 'string',
            description: 'ISO date (YYYY-MM-DD) — must be today or in the future',
          },
          reasoning: {
            type: 'string',
            description: 'One or two sentences explaining why this is the best next step right now.',
          },
          suggested_track: {
            type: 'string',
            enum: ['partnership', 'consulting', 'audit'],
            description: 'Optional — only set if the deal should be assigned to a specific track and currently has none.',
          },
        },
        required: ['action', 'due_date', 'reasoning'],
      },
    },
    max_tokens: 1024,
    effort: 'medium',
    thinking: true,
  });
}
