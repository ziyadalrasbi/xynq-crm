import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from 'date-fns';

export function formatGBP(value: number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM yyyy');
}

export function formatRelative(date: string | Date | null | undefined) {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function daysUntil(date: string | null | undefined, today: Date = new Date()): number | null {
  if (!date) return null;
  return differenceInCalendarDays(parseISO(date), today);
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function addDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
}
