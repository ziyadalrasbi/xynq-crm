import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { triageEmail } from '@/lib/claude/features/triage';

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const { rawEmail, fromEmail } = await request.json();
    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json({ error: 'rawEmail required' }, { status: 400 });
    }
    const result = await triageEmail({ rawEmail, fromEmail });
    return NextResponse.json(result);
  } catch (err) {
    console.error('triage error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
