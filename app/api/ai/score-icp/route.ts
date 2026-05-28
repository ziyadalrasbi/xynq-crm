import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { scoreIcpFit } from '@/lib/claude/features/score-icp';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  try {
    const { companyId, persist } = await request.json();
    if (!companyId) {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }
    const result = await scoreIcpFit({ companyId });

    if (persist) {
      const supabase = createClient();
      await supabase
        .from('companies')
        .update({
          icp_score: result.score,
          icp_score_breakdown: result.breakdown,
        })
        .eq('id', companyId);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('score-icp error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
