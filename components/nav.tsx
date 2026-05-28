import Link from 'next/link';

const links = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/chat', label: 'Chat' },
  { href: '/feed', label: 'Feed' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/referrals', label: 'Referrals' },
  { href: '/triage', label: 'Triage' },
  { href: '/companies/new', label: '+ Company' },
];

const rightLinks = [
  { href: '/settings/share', label: 'Share' },
];

export function Nav() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            XYNQ
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-muted hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {rightLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-xs text-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-xs text-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
