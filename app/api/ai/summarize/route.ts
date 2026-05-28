import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { summarizeInteraction } from '@/lib/claude/features/summarize';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const { rawText, companyName } = await request.json();
    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'rawText required' }, { status: 400 });
    }
    const result = await summarizeInteraction({ rawText, companyName });
    return NextResponse.json(result);
  } catch (err) {
    console.error('summarize error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
