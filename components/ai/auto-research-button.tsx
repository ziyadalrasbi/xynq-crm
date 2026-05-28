'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ResearchResult = {
  description: string;
  industry: string;
  sub_type: string | null;
  engine_pipe: string | null;
  tags: string[];
  key_people: { name: string; role: string }[];
  tech_stack_signals: string[];
  pitch_angle: string;
  website: string | null;
};

/**
 * Auto-research the company by name. Pre-fills form fields (notes, industry,
 * sub_type, engine_pipe, tags, website) and surfaces the suggested primary
 * contact + pitch angle inline.
 *
 * Operates on field IDs in the parent form — no need to lift state.
 */
export function AutoResearchButton({ nameId }: { nameId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);

  function setField(id: string, value: string) {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (el) el.value = value;
  }

  async function run() {
    const nameInput = document.getElementById(nameId) as HTMLInputElement | null;
    const companyName = nameInput?.value.trim();
    if (!companyName) {
      setError('Enter company name first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/auto-research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ companyName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ResearchResult;
      setResult(data);

      // Pre-fill form fields
      setField('industry', data.industry);
      if (data.sub_type) setField('sub_type', data.sub_type);
      if (data.engine_pipe) setField('engine_pipe', data.engine_pipe);
      if (data.website) setField('website', data.website);
      setField('tags', data.tags.join(', '));

      // Compose notes: description + tech signals + pitch angle
      const notes = [
        data.description,
        data.tech_stack_signals.length ? `\nTech signals: ${data.tech_stack_signals.join(', ')}` : '',
        `\nPitch angle: ${data.pitch_angle}`,
      ]
        .filter(Boolean)
        .join('\n');
      setField('notes', notes);

      // Fill primary contact if found
      if (data.key_people.length > 0) {
        const primary = data.key_people[0];
        setField('contact_name', primary.name);
        if (primary.role) setField('contact_role', primary.role);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="secondary" onClick={run} disabled={loading} className="w-full">
        {loading ? '🔍 Researching… (this can take ~30s)' : '🔍 Auto-research with AI'}
      </Button>
      {error && <p className="text-xs text-overdue">Error: {error}</p>}
      {result && (
        <div className="rounded border border-border bg-bg px-3 py-2 text-xs">
          <div className="flex items-baseline gap-2">
            <Badge variant="accent">Filled below</Badge>
            <span className="text-muted">Review and edit before saving.</span>
          </div>
          {result.key_people.length > 0 && (
            <p className="mt-1.5 text-muted">
              <span className="font-medium text-ink">Key people:</span>{' '}
              {result.key_people.map((p) => `${p.name} (${p.role})`).join(', ')}
            </p>
          )}
          {result.engine_pipe && (
            <p className="mt-1 text-muted">
              <span className="font-medium text-ink">Engine/Pipe:</span> {result.engine_pipe}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
