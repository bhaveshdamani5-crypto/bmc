import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Guest status poll. The unguessable access_token in the link is the credential. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id'); const t = req.nextUrl.searchParams.get('t');
  if (!id || !t) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const { data } = await createAdminClient().from('orders').select('order_number,status,total_paise').eq('id', id).eq('access_token', t).maybeSingle();
  return data ? NextResponse.json(data) : NextResponse.json({ error: 'not found' }, { status: 404 });
}
