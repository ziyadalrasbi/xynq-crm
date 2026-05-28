import { cacheableSystem, runTextCall } from '../helpers';

/**
 * Given a structured digest of the week, ask Claude to identify the single
 * highest-leverage action Leo should take this week.
 */
export async function digestSuggestion(opts: {
  digestSummary: string;
}): Promise<string> {
  const { text } = await runTextCall({
    system: cacheableSystem(),
    messages: [
      {
        role: 'user',
        content: `Below is a structured summary of XYNQ's pipeline this week. Identify the SINGLE highest-leverage action Leo should take. Be specific (name the company, name the action) and brief (2-3 sentences).

${opts.digestSummary}

Output just the recommendation, no preamble.`,
      },
    ],
    max_tokens: 512,
    effort: 'medium',
    thinking: true,
  });
  return text.trim();
}
