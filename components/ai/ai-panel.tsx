'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, Section } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/field';

type DraftResult = { subject: string; body: string };
type SuggestActionResult = {
  action: string;
  due_date: string;
  reasoning: string;
  suggested_track?: string;
};
type IcpResult = {
  score: number;
  breakdown: Record<string, number>;
  reasoning: string;
};

type Tab = null | 'draft' | 'action' | 'icp';

export function AIPanel({ companyId }: { companyId: string }) {
  const [active, setActive] = useState<Tab>(null);
  const [intent, setIntent] = useState('');
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestActionResult | null>(null);
  const [icp, setIcp] = useState<IcpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function run<T>(url: string, body: object): Promise<T | null> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleDraft() {
    setActive('draft');
    setDraft(null);
    const result = await run<DraftResult>('/api/ai/draft-email', { companyId, intent });
    if (result) setDraft(result);
  }

  async function handleSuggest() {
    setActive('action');
    setSuggestion(null);
    const result = await run<SuggestActionResult>('/api/ai/suggest-action', { companyId });
    if (result) setSuggestion(result);
  }

  async function handleScore() {
    setActive('icp');
    setIcp(null);
    const result = await run<IcpResult>('/api/ai/score-icp', { companyId, persist: true });
    if (result) {
      setIcp(result);
      startTransition(() => router.refresh());
    }
  }

  return (
    <Section title="AI">
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleDraft} disabled={loading}>
            {loading && active === 'draft' ? 'Drafting…' : 'Draft follow-up email'}
          </Button>
          <Button variant="secondary" onClick={handleSuggest} disabled={loading}>
            {loading && active === 'action' ? 'Thinking…' : 'Suggest next action'}
          </Button>
          <Button variant="secondary" onClick={handleScore} disabled={loading}>
            {loading && active === 'icp' ? 'Scoring…' : 'Score ICP'}
          </Button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-overdue">Error: {error}</p>
        )}

        {active === 'draft' && (
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="intent">Intent (optional)</Label>
              <Input
                id="intent"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder='e.g. "post-call thank you", "check in after 2 weeks"'
              />
            </div>
            {draft && (
              <div className="space-y-2 border-t border-border pt-3">
                <div className="space-y-1">
                  <Label htmlFor="draft-subject">Subject</Label>
                  <Input
                    id="draft-subject"
                    value={draft.subject}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="draft-body">Body</Label>
                  <Textarea
                    id="draft-body"
                    value={draft.body}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    className="min-h-[200px] font-mono text-[13px]"
                  />
                </div>
                <CopyButton text={`Subject: ${draft.subject}\n\n${draft.body}`} />
              </div>
            )}
          </div>
        )}

        {active === 'action' && suggestion && (
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{suggestion.action}</span>
              <Badge variant="due">due {suggestion.due_date}</Badge>
              {suggestion.suggested_track && (
                <Badge variant="accent">track: {suggestion.suggested_track}</Badge>
              )}
            </div>
            <p className="text-xs text-muted">{suggestion.reasoning}</p>
            <CopyButton
              text={`${suggestion.action} (due ${suggestion.due_date})`}
              label="Copy action"
            />
            <p className="text-xs text-muted">
              Apply manually via the deal&rsquo;s Edit form above, or copy and adjust.
            </p>
          </div>
        )}

        {active === 'icp' && icp && (
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{icp.score}</span>
              <span className="text-sm text-muted">/ 10</span>
              <Badge variant="accent">saved</Badge>
            </div>
            <p className="text-xs text-muted">{icp.reasoning}</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted hover:text-ink">Breakdown</summary>
              <ul className="mt-2 grid grid-cols-2 gap-1">
                {Object.entries(icp.breakdown).map(([k, v]) => (
                  <li key={k} className="font-mono">
                    {k}: <span className="font-semibold">{v}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </Card>
    </Section>
  );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={clsx(copied && 'bg-won/10 text-won')}
    >
      {copied ? 'Copied ✓' : label}
    </Button>
  );
}
