import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:opacity-90',
  secondary: 'bg-white text-ink border border-border hover:bg-bg',
  ghost: 'text-ink hover:bg-bg',
  danger: 'bg-overdue text-white hover:opacity-90',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center rounded px-3 py-1.5 text-sm font-medium transition disabled:opacity-50',
        variants[variant],
        className,
      )}
    />
  );
}
