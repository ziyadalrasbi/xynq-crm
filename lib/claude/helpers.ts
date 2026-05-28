import type Anthropic from '@anthropic-ai/sdk';
import { claude, MODEL, SYSTEM_PROMPT_BASE } from './index';

/**
 * Build a cacheable system block. Single breakpoint at the end of the
 * combined system + per-call context — gives same-company / same-prefix
 * follow-up requests a chance to hit the cache.
 */
export function cacheableSystem(extraContext = ''): Anthropic.TextBlockParam[] {
  const text = extraContext ? `${SYSTEM_PROMPT_BASE}\n\n${extraContext}` : SYSTEM_PROMPT_BASE;
  return [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];
}

/**
 * Run a single tool-use call with a forced tool and return the parsed input.
 * Caller is responsible for typing the return value.
 */
export async function runStructuredCall<T = Record<string, unknown>>(opts: {
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  tool: { name: string; description: string; input_schema: Anthropic.Tool.InputSchema };
  max_tokens?: number;
  effort?: 'low' | 'medium' | 'high';
  thinking?: boolean;
}): Promise<T> {
  const tools: Anthropic.ToolUnion[] = [
    {
      name: opts.tool.name,
      description: opts.tool.description,
      input_schema: opts.tool.input_schema,
    } as Anthropic.Tool,
  ];

  const request: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: opts.max_tokens ?? 2048,
    system: opts.system,
    messages: opts.messages,
    tools,
    tool_choice: { type: 'tool', name: opts.tool.name },
  };

  if (opts.thinking) {
    (request as any).thinking = { type: 'adaptive' };
  }
  if (opts.effort) {
    (request as any).output_config = { effort: opts.effort };
  }

  const response = await claude.messages.create(request);
  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return a tool_use block');
  }
  return toolUse.input as T;
}

/**
 * Run a plain text call. Returns the concatenated text from all text blocks.
 */
export async function runTextCall(opts: {
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  max_tokens?: number;
  effort?: 'low' | 'medium' | 'high';
  thinking?: boolean;
}): Promise<{ text: string; usage: Anthropic.Usage }> {
  const request: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: opts.max_tokens ?? 2048,
    system: opts.system,
    messages: opts.messages,
  };

  if (opts.thinking) {
    (request as any).thinking = { type: 'adaptive' };
  }
  if (opts.effort) {
    (request as any).output_config = { effort: opts.effort };
  }

  const response = await claude.messages.create(request);
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('\n');
  return { text, usage: response.usage };
}
