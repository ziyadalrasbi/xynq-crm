import { cacheableSystem, runStructuredCall } from '../helpers';

export type TagSuggestions = {
  tags: string[];
};

const EXISTING_TAGS_HINT = `Common XYNQ tags (reuse where they fit, don't reinvent):
distributor, rights_platform, trade_body, label, publisher, enterprise,
african_market, merlin_member, merlin_board, wmg_signed, priority,
partnership, internal, case_study, content_provenance, connector,
commission_partner, strategic_wedge`;

export async function suggestTags(opts: {
  companyName: string;
  description: string;
  industry?: string;
}): Promise<TagSuggestions> {
  return runStructuredCall<TagSuggestions>({
    system: cacheableSystem(EXISTING_TAGS_HINT),
    messages: [
      {
        role: 'user',
        content: `Suggest 3–6 short snake_case tags for "${opts.companyName}".

Description: ${opts.description}
${opts.industry ? `Industry: ${opts.industry}` : ''}

Prefer reusing existing tags over inventing new ones. Don't tag the industry itself (industry is a separate field).`,
      },
    ],
    tool: {
      name: 'suggest_tags',
      description: 'Suggest tags for a company.',
      input_schema: {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 8,
          },
        },
        required: ['tags'],
      },
    },
    max_tokens: 512,
    effort: 'low',
  });
}
