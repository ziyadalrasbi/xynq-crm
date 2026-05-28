import type Anthropic from '@anthropic-ai/sdk';
import { claude, MODEL } from '../index';
import { cacheableSystem } from '../helpers';

export type ResearchResult = {
  description: string;
  industry: 'music' | 'film_vfx' | 'gaming' | 'publishing' | 'advertising' | 'cross_sector';
  sub_type: string | null;
  engine_pipe: 'engine' | 'pipe' | 'both' | null;
  tags: string[];
  key_people: { name: string; role: string }[];
  tech_stack_signals: string[];
  pitch_angle: string;
  website: string | null;
};

/**
 * Auto-research a company by name. Uses Claude's native web search to pull
 * description, key people, tech signals, and a one-paragraph "why XYNQ matters"
 * pitch angle. Returns structured fields ready to pre-fill the add-company form.
 *
 * Higher effort + adaptive thinking because this is a multi-step task:
 * search → read → synthesize → structure.
 */
export async function autoResearchCompany(opts: {
  companyName: string;
}): Promise<ResearchResult> {
  // Two-step: do free-form research with web search, then extract structured.
  const research = await claude.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: cacheableSystem(),
    messages: [
      {
        role: 'user',
        content: `Research "${opts.companyName}" using web search. Find:
- What they do (one paragraph)
- Industry (music / film / gaming / publishing / advertising / cross-sector)
- Whether they're an ENGINE (decision/process content), PIPE (DSP delivery), or both
- Key people (CEO, CTO, Head of Ops)
- Tech stack signals from job postings, blog posts, or docs
- Whether they process content through automated systems (relevant for XYNQ's ICP)
- Their website URL

Then write a one-paragraph "why XYNQ matters to them" pitch angle.

Be thorough but concise. Cite specific findings.`,
      },
    ],
    tools: [
      {
        type: 'web_search_20260209' as any,
        name: 'web_search',
        max_uses: 8,
      } as any,
    ],
    output_config: { effort: 'high' } as any,
    thinking: { type: 'adaptive' } as any,
  } as Anthropic.MessageCreateParamsNonStreaming);

  // Pull the text content from the research call
  const researchText = research.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('\n\n');

  // Step 2: structure it
  const structureRequest: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: 2048,
    system: cacheableSystem(),
    messages: [
      {
        role: 'user',
        content: `Based on this research about "${opts.companyName}", extract structured fields.

Research:
---
${researchText}
---`,
      },
    ],
    tools: [
      {
        name: 'capture_research',
        description: 'Capture company research as structured fields.',
        input_schema: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'One paragraph, plain prose.' },
            industry: {
              type: 'string',
              enum: ['music', 'film_vfx', 'gaming', 'publishing', 'advertising', 'cross_sector'],
            },
            sub_type: {
              type: ['string', 'null'],
              description: 'For music: "DIY+Own Backend" / "DIY+No Backend" / "Non-DIY+Own Backend" / "Non-DIY+No Backend" / "Inactive". For others, null.',
            },
            engine_pipe: {
              type: ['string', 'null'],
              enum: ['engine', 'pipe', 'both', null],
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: '3-6 short snake_case tags, e.g. "distributor", "african_market", "rights_platform".',
            },
            key_people: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
                required: ['name', 'role'],
              },
            },
            tech_stack_signals: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tech signals found, e.g. "MongoDB", "GCP", "DDEX-based ingest".',
            },
            pitch_angle: {
              type: 'string',
              description: 'One paragraph: why XYNQ matters to this company specifically.',
            },
            website: { type: ['string', 'null'] },
          },
          required: ['description', 'industry', 'sub_type', 'engine_pipe', 'tags', 'key_people', 'tech_stack_signals', 'pitch_angle', 'website'],
        },
      } as Anthropic.Tool,
    ],
    tool_choice: { type: 'tool', name: 'capture_research' },
    ...({ output_config: { effort: 'low' } } as any),
  };

  const structured = await claude.messages.create(structureRequest);
  const toolUse = structured.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Failed to structure research output');
  }
  return toolUse.input as ResearchResult;
}
