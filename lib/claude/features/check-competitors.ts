import { buildCompetitorList } from '../context';
import { cacheableSystem, runStructuredCall } from '../helpers';

export type CompetitorMatch = {
  matches: {
    competitor_name: string;
    relationship: 'competing' | 'vendor' | 'complementary' | 'unclear';
    evidence: string;
  }[];
};

/**
 * Given a company description, check whether any known XYNQ competitors are
 * already working with this company (or otherwise relevant).
 */
export async function checkCompetitors(opts: {
  companyName: string;
  description: string;
}): Promise<CompetitorMatch> {
  const competitorList = await buildCompetitorList();
  if (!competitorList) {
    return { matches: [] };
  }

  return runStructuredCall<CompetitorMatch>({
    system: cacheableSystem(competitorList),
    messages: [
      {
        role: 'user',
        content: `Does the description of "${opts.companyName}" suggest any of the known competitors / vendors above are already working with them, or otherwise relevant to the deal?

Description:
${opts.description}

Return a match only when the evidence is concrete (a name dropped, a known integration, a board overlap, etc.). If nothing concrete, return an empty matches array — do not speculate.`,
      },
    ],
    tool: {
      name: 'flag_competitors',
      description: 'Flag known competitors/vendors relevant to this company.',
      input_schema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                competitor_name: { type: 'string' },
                relationship: {
                  type: 'string',
                  enum: ['competing', 'vendor', 'complementary', 'unclear'],
                },
                evidence: { type: 'string' },
              },
              required: ['competitor_name', 'relationship', 'evidence'],
            },
          },
        },
        required: ['matches'],
      },
    },
    max_tokens: 1024,
    effort: 'low',
  });
}
