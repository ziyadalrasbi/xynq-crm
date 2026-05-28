'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/field';
import { saveTriageOutcome, type SaveTriagePayload } from '@/app/triage/actions';

type TriageResult = {
  classification: string;
  matched_company_id: string | null;
  matched_contact_id: string | null;
  summary: string;
  action_items: string[];
  follow_up_date: string | null;
  draft_reply: { subject: string; body: string };
  new_contacts: { name: string; role?: string; email?: string }[];
  new_referrals: { from: string; to: string; context: string }[];
};

const classificationVariants: Record<string, 'accent' | 'won' | 'overdue' | 'due' | 'muted'> = {
  interested: 'won',
  scheduling: 'accent',
  referral: 'accent',
  cold_ask: 'due',
  rejection: 'overdue',
  admin: 'muted',
  other: 'muted',
};

export function TriageForm() {
  const [rawEmail, setRawEmail] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [contactSelections, setContactSelections] = useState<boolean[]>([]);
  const [referralSelections, setReferralSelections] = useState<boolean[]>([]);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function analyse() {
    if (!rawEmail.trim()) {
      setError('Paste an email first');
      return;
    }
    setError(null);
    setSavedMsg(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/triage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rawEmail, fromEmail: fromEmail || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as TriageResult;
      setResult(data);
      setContactSelections(data.new_contacts.map(() => true));
      setReferralSelections(data.new_referrals.map(() => true));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!result) return;
    if (!result.matched_company_id) {
      setError('No matching company in CRM. Add the company first, then re-run.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: SaveTriagePayload = {
        matched_company_id: result.matched_company_id,
        matched_contact_id: result.matched_contact_id,
        summary: result.summary,
        follow_up_date: result.follow_up_date,
        new_contacts: result.new_contacts.map((c, i) => ({ ...c, add: contactSelections[i] })),
        new_referrals: result.new_referrals.map((r, i) => ({ ...r, add: referralSelections[i] })),
      };
      await saveTriageOutcome(payload);
      setSavedMsg('Saved. Interaction logged, contacts/referrals added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function copyReply() {
    if (!result) return;
    const text = `Subject: ${result.draft_reply.subject}\n\n${result.draft_reply.body}`;
    await navigator.clipboard.writeText(text);
    setSavedMsg('Reply copied to clipboard.');
    setTimeout(() => setSavedMsg(null), 2000);
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-4">
        <div className="space-y-1">
          <Label htmlFor="from-email">From (optional but helps matching)</Label>
          <Input
            id="from-email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="lee@rightshub.io"
            type="email"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="raw-email">Raw email body</Label>
          <Textarea
            id="raw-email"
            value={rawEmail}
            onChange={(e) => setRawEmail(e.target.value)}
            placeholder="Paste the full email here…"
            className="min-h-[180px]"
          />
        </div>
        <Button onClick={analyse} disabled={loading || !rawEmail.trim()}>
          {loading ? 'Triaging…' : 'Triage'}
        </Button>
        {error && <p className="text-sm text-overdue">{error}</p>}
      </Card>

      {result && (
        <>
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <Badge variant={classificationVariants[result.classification] ?? 'default'}>
                {result.classification}
              </Badge>
              {result.matched_company_id ? (
                <Link
                  href={`/companies/${result.matched_company_id}`}
                  className="text-sm text-accent hover:underline"
                >
                  → matched company
                </Link>
              ) : (
                <Badge variant="muted">no matching company in CRM</Badge>
              )}
              {result.follow_up_date && (
                <Badge variant="due">follow up by {result.follow_up_date}</Badge>
              )}
            </div>
            <p className="text-sm">{result.summary}</p>
            {result.action_items.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Action items
                </h3>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
                  {result.action_items.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Drafted reply
            </h3>
            <div className="space-y-1">
              <Label htmlFor="draft-subject">Subject</Label>
              <Input
                id="draft-subject"
                value={result.draft_reply.subject}
                onChange={(e) =>
                  setResult({
                    ...result,
                    draft_reply: { ...result.draft_reply, subject: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="draft-body">Body</Label>
              <Textarea
                id="draft-body"
                value={result.draft_reply.body}
                onChange={(e) =>
                  setResult({
                    ...result,
                    draft_reply: { ...result.draft_reply, body: e.target.value },
                  })
                }
                className="min-h-[180px] font-mono text-[13px]"
              />
            </div>
            <Button variant="secondary" onClick={copyReply}>
              Copy reply
            </Button>
          </Card>

          {(result.new_contacts.length > 0 || result.new_referrals.length > 0) && (
            <Card className="space-y-4 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Extracted entities — review before saving
              </h3>

              {result.new_contacts.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-ink">New contacts</h4>
                  <ul className="mt-1 space-y-1">
                    {result.new_contacts.map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={contactSelections[i] ?? false}
                          onChange={(e) =>
                            setContactSelections((s) =>
                              s.map((v, idx) => (idx === i ? e.target.checked : v)),
                            )
                          }
                        />
                        <span className="font-medium">{c.name}</span>
                        {c.role && <span className="text-muted">· {c.role}</span>}
                        {c.email && <span className="text-muted">· {c.email}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.new_referrals.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-ink">New referrals</h4>
                  <ul className="mt-1 space-y-1">
                    {result.new_referrals.map((r, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={referralSelections[i] ?? false}
                          onChange={(e) =>
                            setReferralSelections((s) =>
                              s.map((v, idx) => (idx === i ? e.target.checked : v)),
                            )
                          }
                        />
                        <span>
                          {r.from} → {r.to} <span className="text-muted">— {r.context}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving || !result.matched_company_id}>
              {saving ? 'Saving…' : 'Save (log interaction + add selected)'}
            </Button>
            {savedMsg && <span className="text-sm text-won">{savedMsg}</span>}
          </div>
        </>
      )}
    </div>
  );
}
