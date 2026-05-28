'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/field';
import { formatRelative } from '@/lib/format';
import { approveDraft, dismissDraft } from '@/app/inbox/actions';

type Draft = {
  id: string;
  subject: string | null;
  body: string | null;
  generated_at: string;
  notes: string | null;
  company: { id: string; name: string } | null;
  deal: { id: string; deal_name: string; stage: string } | null;
};

export function DraftCard({ draft }: { draft: Draft }) {
  const [expanded, setExpanded] = useState(false);
  const approve = approveDraft.bind(null, draft.id);
  const dismiss = dismissDraft.bind(null, draft.id);

  return (
    <Card className="p-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            {draft.company && (
              <Link
                href={`/companies/${draft.company.id}`}
                className="text-sm font-medium hover:text-accent"
              >
                {draft.company.name}
              </Link>
            )}
            <Badge variant="due">auto-draft</Badge>
            <span className="text-xs text-muted">{formatRelative(draft.generated_at)}</span>
          </div>
          {draft.subject && <p className="mt-0.5 text-sm">{draft.subject}</p>}
          {draft.notes && <p className="mt-0.5 text-xs text-muted">{draft.notes}</p>}
        </div>
        <div className="shrink-0">
          <Button variant="secondary" onClick={() => setExpanded((v) => !v)} className="text-xs">
            {expanded ? 'Collapse' : 'Review'}
          </Button>
        </div>
      </div>

      {expanded && (
        <form action={approve} className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="space-y-1">
            <Label htmlFor={`subj-${draft.id}`}>Subject</Label>
            <Input id={`subj-${draft.id}`} name="subject" defaultValue={draft.subject ?? ''} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`body-${draft.id}`}>Body</Label>
            <Textarea
              id={`body-${draft.id}`}
              name="body"
              defaultValue={draft.body ?? ''}
              className="min-h-[180px] font-mono text-[13px]"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Approve & log as sent</Button>
            <Button type="submit" formAction={dismiss} variant="secondary">
              Dismiss
            </Button>
          </div>
          <p className="text-xs text-muted">
            &ldquo;Approve&rdquo; saves an email_sent interaction with this body. Copy-paste into your email client to actually send.
          </p>
        </form>
      )}
    </Card>
  );
}
