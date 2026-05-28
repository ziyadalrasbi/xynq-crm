import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { suggestStageFromInteraction } from '@/lib/claude/features/suggest-stage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const { companyId, interactionText, currentStage } = await request.json();
    if (!companyId || !interactionText || !currentStage) {
      return NextResponse.json(
        { error: 'companyId, interactionText, currentStage required' },
        { status: 400 },
      );
    }
    const result = await suggestStageFromInteraction({ companyId, interactionText, currentStage });
    return NextResponse.json(result);
  } catch (err) {
    console.error('suggest-stage error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
