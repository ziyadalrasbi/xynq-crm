'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Renders a "Summarize with AI" button that reads from a textarea by id,
 * sends to /api/ai/summarize, and writes the cleaned summary back to the
 * same textarea. Also fills the follow_up_date field if found.
 */
export function SummarizeButton({
  textareaId,
  followUpDateId,
  companyName,
}: {
  textareaId: string;
  followUpDateId?: string;
  companyName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!textarea) return;
    const rawText = textarea.value.trim();
    if (!rawText) {
      setError('Paste raw notes first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rawText, companyName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();

      // Write back: summary first, then action items, then mentioned contacts/referrals
      const parts: string[] = [data.summary];
      if (data.action_items?.length) {
        parts.push('\nAction items:');
        for (const a of data.action_items) parts.push(`- ${a}`);
      }
      if (data.contacts_mentioned?.length) {
        parts.push(`\nContacts mentioned: ${data.contacts_mentioned.join(', ')}`);
      }
      if (data.referrals_mentioned?.length) {
        parts.push('\nReferrals offered:');
        for (const r of data.referrals_mentioned) {
          parts.push(`- ${r.from} → ${r.to}: ${r.context}`);
        }
      }
      textarea.value = parts.join('\n');

      if (data.follow_up_date && followUpDateId) {
        const followUpInput = document.getElementById(followUpDateId) as HTMLInputElement | null;
        if (followUpInput) followUpInput.value = data.follow_up_date;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="secondary" onClick={run} disabled={loading} className="w-full">
        {loading ? 'Summarizing…' : '✨ Summarize with AI'}
      </Button>
      {error && <p className="text-xs text-overdue">{error}</p>}
    </div>
  );
}
