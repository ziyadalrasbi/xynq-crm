import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Guard for API route handlers — returns null if authenticated, otherwise
 * a 401 NextResponse the caller should return immediately.
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}
