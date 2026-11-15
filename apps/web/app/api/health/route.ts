import { connection, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';

/** Uptime monitors hit this. Reports app + database status without leaking details. */
export async function GET() {
  await connection(); // always evaluate at request time, never at build time
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, app: 'up', database: 'not_configured' });
  }
  try {
    const db = createAdminClient();
    const { error } = await db.from('restaurants').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, app: 'up', database: 'up' });
  } catch {
    return NextResponse.json({ ok: false, app: 'up', database: 'down' }, { status: 503 });
  }
}
