import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { checkCompetitors } from '@/lib/claude/features/check-competitors';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const { companyName, description } = await request.json();
    if (!companyName || !description) {
      return NextResponse.json(
        { error: 'companyName and description required' },
        { status: 400 },
      );
    }
    const result = await checkCompetitors({ companyName, description });
    return NextResponse.json(result);
  } catch (err) {
    console.error('check-competitors error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
