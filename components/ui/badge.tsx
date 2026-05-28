import clsx from 'clsx';

type Variant = 'default' | 'overdue' | 'due' | 'won' | 'muted' | 'accent';

const variants: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-600',
  overdue: 'bg-red-50 text-red-600',
  due: 'bg-amber-50 text-amber-700',
  won: 'bg-emerald-50 text-emerald-700',
  muted: 'bg-slate-100 text-slate-500',
  accent: 'bg-indigo-50 text-indigo-600',
};

export function Badge({
  variant = 'default',
  children,
  className,
}: {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    active: 'accent',
    stalled: 'due',
    won: 'won',
    lost: 'muted',
    paused: 'muted',
  };
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>;
}
