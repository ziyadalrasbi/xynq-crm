import { NextResponse } from 'next/server';

/**
 * Guard for cron route handlers. Vercel cron sends `Authorization: Bearer <CRON_SECRET>`
 * automatically when the env var is set on the project. Returns null if authorized.
 */
export function requireCronAuth(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 503 },
    );
  }
  const header = request.headers.get('authorization');
  if (header !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}
