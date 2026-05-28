import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, Section } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/field';
import { listShareTokens } from '@/lib/queries';
import { formatDate, formatRelative } from '@/lib/format';
import { CopyLink } from '@/components/share/copy-link';
import { createShareToken, revokeShareToken } from './actions';

export const dynamic = 'force-dynamic';

export default async function ShareSettingsPage() {
  const tokens = await listShareTokens();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Advisor share links</h1>
        <p className="mt-1 text-sm text-muted">
          Read-only pipeline view shareable with advisors. Shows stages, deal values, recent
          wins. Hides interaction details, contacts, notes, and drafts. Revoke any time.
        </p>
      </div>

      <Section title="Generate a new link">
        <Card className="p-4">
          <form action={createShareToken} className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="label">Label (advisor name or audience)</Label>
              <Input id="label" name="label" placeholder="e.g. Edu" required autoFocus />
            </div>
            <Button type="submit">Generate</Button>
          </form>
        </Card>
      </Section>

      <Section title={`Active links (${tokens.filter((t: any) => !t.revoked_at).length})`}>
        <Card>
          {tokens.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">No share links yet.</p>
          ) : (
            tokens.map((t: any) => {
              const url = `${baseUrl}/share/${t.token}`;
              return (
                <div key={t.id} className="border-b border-border px-3 py-2.5 last:border-b-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">{t.label}</span>
                        {t.revoked_at ? (
                          <Badge variant="muted">revoked</Badge>
                        ) : (
                          <Badge variant="won">active</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        Created {formatDate(t.created_at)}
                        {t.last_accessed_at && (
                          <> · last viewed {formatRelative(t.last_accessed_at)}</>
                        )}
                      </p>
                    </div>
                    {!t.revoked_at && (
                      <form action={revokeShareToken.bind(null, t.id)}>
                        <Button type="submit" variant="ghost" className="text-xs text-overdue">
                          Revoke
                        </Button>
                      </form>
                    )}
                  </div>
                  {!t.revoked_at && <CopyLink url={url} />}
                </div>
              );
            })
          )}
        </Card>
      </Section>
    </main>
  );
}
