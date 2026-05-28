import { buildCompanyContext } from '../context';
import { cacheableSystem, runStructuredCall } from '../helpers';

export type IcpScoreResult = {
  score: number; // 0-10
  breakdown: {
    automated_content: number; // 0-3
    eu_market: number;          // 0-2
    own_backend: number;         // 0-2
    chokepoint: number;          // 0-3
    volume: number;              // 0-2
    funded: number;              // 0-1
    music: number;               // 0-1
  };
  reasoning: string;
};

export async function scoreIcpFit(opts: {
  companyId: string;
}): Promise<IcpScoreResult> {
  const context = await buildCompanyContext(opts.companyId);
  if (!context) throw new Error('Company not found');

  return runStructuredCall<IcpScoreResult>({
    system: cacheableSystem(context),
    messages: [
      {
        role: 'user',
        content: `Score this company's ICP fit using the XYNQ rubric. The score is the SUM of the breakdown (max 14, capped at 10).

Rubric (each factor independently):
- automated_content (0-3): do they process content through automated systems?
- eu_market (0-2): do they serve EU markets?
- own_backend (0-2): do they have their own backend?
- chokepoint (0-3): are they a chokepoint (content flows through them to others)?
- volume (0-2): 0=unknown/<100K tracks, 1=>100K, 2=>1M
- funded (0-1): can they pay? funded=1, bootstrapped=0
- music (0-1): are they in music (our beachhead)?

Be conservative — only score positive when the context supports it. If unknown, score 0.

Final score = min(10, sum of breakdown).`,
      },
    ],
    tool: {
      name: 'score_icp',
      description: 'Score a company on XYNQ ICP fit.',
      input_schema: {
        type: 'object',
        properties: {
          score: { type: 'integer', minimum: 0, maximum: 10 },
          breakdown: {
            type: 'object',
            properties: {
              automated_content: { type: 'integer', minimum: 0, maximum: 3 },
              eu_market: { type: 'integer', minimum: 0, maximum: 2 },
              own_backend: { type: 'integer', minimum: 0, maximum: 2 },
              chokepoint: { type: 'integer', minimum: 0, maximum: 3 },
              volume: { type: 'integer', minimum: 0, maximum: 2 },
              funded: { type: 'integer', minimum: 0, maximum: 1 },
              music: { type: 'integer', minimum: 0, maximum: 1 },
            },
            required: ['automated_content', 'eu_market', 'own_backend', 'chokepoint', 'volume', 'funded', 'music'],
          },
          reasoning: { type: 'string', description: '2-3 sentences justifying the score.' },
        },
        required: ['score', 'breakdown', 'reasoning'],
      },
    },
    max_tokens: 1024,
    effort: 'medium',
    thinking: true,
  });
}
