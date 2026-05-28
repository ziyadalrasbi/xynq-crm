import { buildCompanyContext } from '../context';
import { cacheableSystem, runStructuredCall } from '../helpers';

export type StageSuggestion = {
  should_change: boolean;
  suggested_stage: 'exposure_scan' | 'gap_analysis' | 'policy_build' | 'origin_integration' | 'retainer' | 'partnership' | null;
  reason: string;
  contacts_to_add: { name: string; role?: string }[];
  referrals_to_track: { from: string; to: string; context: string }[];
};

/**
 * Given a newly-logged interaction, analyse whether the deal stage should advance
 * and extract any new contacts or referrals mentioned.
 */
export async function suggestStageFromInteraction(opts: {
  companyId: string;
  interactionText: string;
  currentStage: string;
}): Promise<StageSuggestion> {
  const context = await buildCompanyContext(opts.companyId);
  if (!context) throw new Error('Company not found');

  return runStructuredCall<StageSuggestion>({
    system: cacheableSystem(context),
    messages: [
      {
        role: 'user',
        content: `A new interaction was just logged. Analyse it against the current deal stage and recommend whether to advance.

Current stage: ${opts.currentStage}

Stages (in order):
exposure_scan → gap_analysis → policy_build → origin_integration → retainer
(partnership is a parallel track for non-standard deals like rightsHUB / Merlin)

New interaction:
---
${opts.interactionText}
---

Rules for should_change:
- true ONLY if the interaction contains a clear progression signal (e.g. "agreed to CTO call" → gap_analysis; "scoping the integration" → origin_integration; "signed retainer" → retainer)
- false if it's a standard touchpoint, follow-up, or stall
- Be conservative — prefer false unless the signal is unambiguous

Also extract:
- contacts_to_add: any new people mentioned by name with their role
- referrals_to_track: any intros offered ({from: who offered, to: company/person, context: why})`,
      },
    ],
    tool: {
      name: 'suggest_stage_change',
      description: 'Recommend whether to advance the deal stage and surface new entities to add.',
      input_schema: {
        type: 'object',
        properties: {
          should_change: { type: 'boolean' },
          suggested_stage: {
            type: ['string', 'null'],
            enum: ['exposure_scan', 'gap_analysis', 'policy_build', 'origin_integration', 'retainer', 'partnership', null],
          },
          reason: { type: 'string', description: 'One sentence explaining the recommendation.' },
          contacts_to_add: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                role: { type: 'string' },
              },
              required: ['name'],
            },
          },
          referrals_to_track: {
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
        required: ['should_change', 'suggested_stage', 'reason', 'contacts_to_add', 'referrals_to_track'],
      },
    },
    max_tokens: 1024,
    effort: 'medium',
    thinking: true,
  });
}
