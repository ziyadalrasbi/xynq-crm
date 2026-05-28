'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatRelative } from '@/lib/format';

type Contact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  source: string | null;
  referred_by: string | null;
  is_primary: boolean;
  is_advisor: boolean;
  last_interaction_date: string | null;
  company: { id: string; name: string; industry: string } | null;
};

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const [q, setQ] = useState('');
  const [source, setSource] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [showAdvisors, setShowAdvisors] = useState(true);

  const referrerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of contacts) if (c.referred_by) set.add(c.referred_by);
    return Array.from(set).sort();
  }, [contacts]);

  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of contacts) if (c.source) set.add(c.source);
    return Array.from(set).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (!showAdvisors && c.is_advisor) return false;
      if (source && c.source !== source) return false;
      if (referredBy && c.referred_by !== referredBy) return false;
      if (needle) {
        const hay = [c.name, c.role, c.email, c.company?.name].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [contacts, q, source, referredBy, showAdvisors]);

  const fieldClass =
    'rounded border border-border bg-white px-2 py-1 text-xs focus:border-accent focus:outline-none';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search name, role, email, company…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={clsx(fieldClass, 'w-64')}
        />
        <select value={source} onChange={(e) => setSource(e.target.value)} className={fieldClass}>
          <option value="">All sources</option>
          {sourceOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={referredBy} onChange={(e) => setReferredBy(e.target.value)} className={fieldClass}>
          <option value="">All referrers</option>
          {referrerOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={showAdvisors}
            onChange={(e) => setShowAdvisors(e.target.checked)}
          />
          Show advisors
        </label>
        {(q || source || referredBy || !showAdvisors) && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              setSource('');
              setReferredBy('');
              setShowAdvisors(true);
            }}
            className="text-xs text-muted hover:text-ink"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted">{filtered.length} of {contacts.length}</span>
      </div>

      <div className="overflow-x-auto rounded border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Company</th>
              <th className="px-3 py-2 text-left font-medium">Role</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Via</th>
              <th className="px-3 py-2 text-left font-medium">Last touch</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted">
                  No contacts match.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-bg">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {c.is_primary && <Badge variant="accent">primary</Badge>}
                      {c.is_advisor && <Badge variant="muted">advisor</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {c.company ? (
                      <Link href={`/companies/${c.company.id}`} className="hover:text-accent">
                        {c.company.name}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted">{c.role ?? '—'}</td>
                  <td className="px-3 py-2 text-muted">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="hover:text-accent">{c.email}</a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted">{c.source ?? '—'}</td>
                  <td className="px-3 py-2 text-muted">{c.referred_by ?? '—'}</td>
                  <td className="px-3 py-2 text-muted" title={c.last_interaction_date ? formatDate(c.last_interaction_date) : ''}>
                    {c.last_interaction_date ? formatRelative(c.last_interaction_date) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
