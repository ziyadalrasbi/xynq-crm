import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { claude, MODEL, SYSTEM_PROMPT_BASE } from '@/lib/claude';
import { CHAT_TOOLS, executeTool } from '@/lib/claude/chat-tools';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const MAX_TOOL_ITERATIONS = 6;

/**
 * Chat endpoint. Takes a conversation_id and the new user message text,
 * persists the user message, runs the agentic loop with tool use, persists
 * the assistant response, and returns the final assistant text.
 */
export async function POST(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  let body: { conversation_id: string; message: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { conversation_id, message } = body;
  if (!conversation_id || !message?.trim()) {
    return NextResponse.json({ error: 'conversation_id and message required' }, { status: 400 });
  }

  const supabase = createClient();

  // Load existing messages
  const { data: existing, error: loadErr } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true });
  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }

  // Build the conversation in Anthropic message format
  const messages: Anthropic.MessageParam[] = (existing ?? []).map((row: any) => ({
    role: row.role,
    content: row.content,
  }));

  // Append the new user message
  const newUserMessage: Anthropic.MessageParam = {
    role: 'user',
    content: [{ type: 'text', text: message }],
  };
  messages.push(newUserMessage);

  // Persist user message immediately
  await supabase.from('chat_messages').insert({
    conversation_id,
    role: 'user',
    content: newUserMessage.content,
  });

  // Update conversation title if this is the first message
  if ((existing ?? []).length === 0) {
    const title = message.slice(0, 80) + (message.length > 80 ? '…' : '');
    await supabase
      .from('chat_conversations')
      .update({ title })
      .eq('id', conversation_id);
  }

  // Run the agentic loop
  let iterations = 0;
  let finalAssistantContent: Anthropic.ContentBlock[] = [];

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations += 1;

    let response: Anthropic.Message;
    try {
      response = await claude.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: `${SYSTEM_PROMPT_BASE}

You are answering Leo's questions about his XYNQ CRM. Use the provided tools to query real data — never make up facts. Be concise. Use markdown sparingly (lists and bold are fine, no headers for short responses).

Today's date: ${new Date().toISOString().slice(0, 10)}.`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: CHAT_TOOLS,
        messages,
      });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'unknown';
      console.error('chat call failed', errMessage);
      return NextResponse.json({ error: errMessage }, { status: 500 });
    }

    finalAssistantContent = response.content;

    // Push assistant response to history (full content blocks)
    messages.push({ role: 'assistant', content: response.content });

    // If no tool calls, we're done
    if (response.stop_reason !== 'tool_use') break;

    // Execute each tool call, collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      try {
        const result = await executeTool(block.name, block.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      } catch (err) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
          is_error: true,
        });
      }
    }

    // Push tool results as a user message and loop
    messages.push({ role: 'user', content: toolResults });
  }

  // Persist final assistant message
  await supabase.from('chat_messages').insert({
    conversation_id,
    role: 'assistant',
    content: finalAssistantContent,
  });

  // Touch the conversation's updated_at
  await supabase
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversation_id);

  // Extract text content for the client
  const text = finalAssistantContent
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('\n\n');

  return NextResponse.json({
    text,
    iterations,
    used_tools: messages
      .flatMap((m) =>
        Array.isArray(m.content)
          ? m.content.filter((b: any) => b.type === 'tool_use').map((b: any) => b.name)
          : [],
      )
      .slice(-iterations),
  });
}
