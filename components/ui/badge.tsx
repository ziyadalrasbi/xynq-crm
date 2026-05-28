import clsx from 'clsx';

type Variant = 'default' | 'overdue' | 'due' | 'won' | 'muted' | 'accent';

const variants: Record<Variant, string> = {
  default: 'bg-white text-ink border-border',
  overdue: 'bg-overdue/10 text-overdue border-overdue/30',
  due: 'bg-due/10 text-due border-due/30',
  won: 'bg-won/10 text-won border-won/30',
  muted: 'bg-bg text-muted border-border',
  accent: 'bg-accent/10 text-accent border-accent/30',
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
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none',
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
