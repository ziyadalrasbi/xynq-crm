import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { suggestNextAction } from '@/lib/claude/features/suggest-action';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const { companyId } = await request.json();
    if (!companyId) {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }
    const result = await suggestNextAction({ companyId });
    return NextResponse.json(result);
  } catch (err) {
    console.error('suggest-action error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
