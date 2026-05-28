import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { autoResearchCompany } from '@/lib/claude/features/auto-research';

export const runtime = 'nodejs';
export const maxDuration = 300; // web search + structuring can take a minute

export async function POST(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const { companyName } = await request.json();
    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json({ error: 'companyName required' }, { status: 400 });
    }
    const result = await autoResearchCompany({ companyName: companyName.trim() });
    return NextResponse.json(result);
  } catch (err) {
    console.error('auto-research error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
