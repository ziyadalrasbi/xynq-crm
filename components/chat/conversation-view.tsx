'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { formatRelative } from '@/lib/format';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: any; // Anthropic content blocks
  created_at: string;
};

export function ConversationView({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    setInput('');

    // Optimistically add the user message
    const optimisticUser: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: [{ type: 'text', text }],
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimisticUser]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, message: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();

      // Add assistant response
      const assistantMsg: Message = {
        id: `temp-a-${Date.now()}`,
        role: 'assistant',
        content: [{ type: 'text', text: data.text }],
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, assistantMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
      // Roll back the optimistic user message
      setMessages((m) => m.filter((msg) => msg.id !== optimisticUser.id));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && !loading && (
          <div className="rounded border border-border bg-white p-6 text-center text-sm text-muted">
            <p className="font-medium text-ink">Ask anything about your pipeline.</p>
            <p className="mt-2">
              Try:{' '}
              <button
                type="button"
                onClick={() => setInput("who haven't I talked to in 3 weeks?")}
                className="text-accent hover:underline"
              >
                who haven&rsquo;t I talked to in 3 weeks?
              </button>
              {' · '}
              <button
                type="button"
                onClick={() => setInput('summarise the rightsHUB account')}
                className="text-accent hover:underline"
              >
                summarise the rightsHUB account
              </button>
              {' · '}
              <button
                type="button"
                onClick={() => setInput('what should I do first today?')}
                className="text-accent hover:underline"
              >
                what should I do first today?
              </button>
            </p>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
            Thinking…
          </div>
        )}

        {error && (
          <div className="rounded border border-overdue/30 bg-overdue/10 px-3 py-2 text-sm text-overdue">
            Error: {error}
          </div>
        )}
      </div>

      <div className="border-t border-border pt-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything… (⌘+Enter to send)"
          rows={3}
          disabled={loading}
          className="w-full resize-none rounded border border-border bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted">
            Read-only — the agent queries your CRM but can&rsquo;t modify anything.
          </span>
          <Button onClick={send} disabled={loading || !input.trim()}>
            {loading ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const blocks = Array.isArray(message.content) ? message.content : [];
  const text = blocks
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n\n');
  const toolUses = blocks.filter((b: any) => b.type === 'tool_use');

  return (
    <div
      className={clsx(
        'rounded border p-3',
        message.role === 'user'
          ? 'border-accent/20 bg-accent/5'
          : 'border-border bg-white',
      )}
    >
      <div className="flex items-baseline justify-between text-xs text-muted">
        <span className="font-medium uppercase tracking-wide">
          {message.role === 'user' ? 'You' : 'XYNQ'}
        </span>
        <span>{formatRelative(message.created_at)}</span>
      </div>
      {text && (
        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{text}</div>
      )}
      {toolUses.length > 0 && (
        <details className="mt-2 text-xs text-muted">
          <summary className="cursor-pointer hover:text-ink">
            Queried: {toolUses.map((t: any) => t.name).join(', ')}
          </summary>
          <pre className="mt-1 overflow-x-auto rounded bg-bg p-2 font-mono text-[11px]">
            {JSON.stringify(
              toolUses.map((t: any) => ({ name: t.name, input: t.input })),
              null,
              2,
            )}
          </pre>
        </details>
      )}
    </div>
  );
}
