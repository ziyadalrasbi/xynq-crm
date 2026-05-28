'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Inbox,
  LayoutDashboard,
  Columns3,
  Building2,
  Users,
  MessageSquare,
  Activity,
  Zap,
  ArrowLeftRight,
  Link2,
  LogOut,
  PlusCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

const primaryNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/pipeline', label: 'Pipeline', icon: Columns3 },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/contacts', label: 'Contacts', icon: Users },
];

const toolsNav = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/feed', label: 'Feed', icon: Activity },
  { href: '/triage', label: 'Triage', icon: Zap },
  { href: '/referrals', label: 'Referrals', icon: ArrowLeftRight },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        active
          ? 'bg-white/10 text-white'
          : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200',
      )}
    >
      <Icon className="h-[15px] w-[15px] shrink-0" />
      {label}
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  if (pathname.startsWith('/login') || pathname.startsWith('/share')) return null;

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-56 flex-col bg-[#0F172A]">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center border-b border-slate-800 px-5">
        <Link
          href="/dashboard"
          className="text-[13px] font-bold tracking-[0.2em] text-white"
        >
          XYNQ
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {primaryNav.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
              }
            />
          ))}
        </div>

        <div className="mt-5">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Tools
          </p>
          <div className="space-y-0.5">
            {toolsNav.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={pathname === item.href || pathname.startsWith(item.href + '/')}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 px-1">
          <Link
            href="/companies/new"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Company
          </Link>
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="shrink-0 border-t border-slate-800 px-2 py-3">
        <NavItem
          href="/settings/share"
          label="Share"
          icon={Link2}
          active={pathname.startsWith('/settings')}
        />
        <form action="/auth/signout" method="post" className="mt-0.5">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-all hover:bg-white/[0.06] hover:text-slate-200"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
