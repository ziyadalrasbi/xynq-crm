import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/field';
import { listAllReferrals } from '@/lib/queries';
import { formatDate, formatRelative } from '@/lib/format';
import { updateReferralNotes, updateReferralStatus } from './actions';

export const dynamic = 'force-dynamic';

const STATUSES = ['offered', 'accepted', 'intro_made', 'converted', 'dead'] as const;

function statusVariant(status: string): 'accent' | 'won' | 'muted' | 'due' {
  if (status === 'converted') return 'won';
  if (status === 'dead') return 'muted';
  if (status === 'offered') return 'due';
  return 'accent';
}

export default async function ReferralsPage() {
  const referrals = (await listAllReferrals()) as any[];

  const grouped = {
    open: referrals.filter((r) => ['offered', 'accepted', 'intro_made'].includes(r.status)),
    converted: referrals.filter((r) => r.status === 'converted'),
    dead: referrals.filter((r) => r.status === 'dead'),
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Referrals</h1>
        <p className="mt-1 text-sm text-muted">
          Network effect tracker — who offered what intro, status, follow-up.
        </p>
      </div>

      <ReferralGroup title={`Open (${grouped.open.length})`} referrals={grouped.open} />
      <ReferralGroup title={`Converted (${grouped.converted.length})`} referrals={grouped.converted} />
      <ReferralGroup title={`Dead (${grouped.dead.length})`} referrals={grouped.dead} muted />
    </main>
  );
}

function ReferralGroup({
  title,
  referrals,
  muted = false,
}: {
  title: string;
  referrals: any[];
  muted?: boolean;
}) {
  if (referrals.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        <p className="mt-2 text-sm text-muted">None.</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className={muted ? 'opacity-60' : ''}>
        <div className="overflow-x-auto rounded border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">From</th>
                <th className="px-3 py-2 text-left font-medium">To</th>
                <th className="px-3 py-2 text-left font-medium">Context</th>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <ReferralRow key={r.id} referral={r} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ReferralRow({ referral }: { referral: any }) {
  const statusAction = updateReferralStatus.bind(null, referral.id);
  const notesAction = updateReferralNotes.bind(null, referral.id);
  const fromName = referral.from_contact?.name ?? '—';
  const fromCompany = referral.from_contact?.company;
  return (
    <>
      <tr className="border-b border-border last:border-b-0 hover:bg-bg">
        <td className="px-3 py-2 align-top">
          <div className="font-medium">{fromName}</div>
          {fromCompany && (
            <Link href={`/companies/${fromCompany.id}`} className="text-xs text-muted hover:text-accent">
              {fromCompany.name}
            </Link>
          )}
        </td>
        <td className="px-3 py-2 align-top">
          <div className="font-medium">{referral.to_company}</div>
          {referral.to_contact_name && (
            <div className="text-xs text-muted">{referral.to_contact_name}</div>
          )}
        </td>
        <td className="px-3 py-2 align-top text-xs text-muted">{referral.context ?? '—'}</td>
        <td className="px-3 py-2 align-top text-xs text-muted" title={formatDate(referral.date)}>
          {formatRelative(referral.date)}
        </td>
        <td className="px-3 py-2 align-top">
          <form action={statusAction} className="flex items-center gap-1">
            <Select name="status" defaultValue={referral.status} className="text-xs">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </Select>
            <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">Save</Button>
            <Badge variant={statusVariant(referral.status)}>{referral.status}</Badge>
          </form>
          <details className="mt-1 text-xs">
            <summary className="cursor-pointer text-muted hover:text-ink">Notes</summary>
            <form action={notesAction} className="mt-2 space-y-1">
              <Textarea name="notes" defaultValue={referral.notes ?? ''} className="min-h-[60px]" />
              <Button type="submit" variant="secondary" className="text-xs">Save notes</Button>
            </form>
          </details>
        </td>
      </tr>
    </>
  );
}
