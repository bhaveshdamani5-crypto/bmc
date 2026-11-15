import { connection, NextResponse } from 'next/server';
import { getStaff } from '@/lib/auth/staff';
import { createClient } from '@/lib/supabase/server';

/** Active orders for the signed-in staff member's restaurant. RLS enforces the tenant boundary. */
export async function GET() {
  await connection(); // request-time only, never prerendered
  if (!(await getStaff())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.from('orders')
    .select('id,order_number,status,created_at,guest_note,tables(label),order_items(name_snapshot,variant_snapshot,modifiers_snapshot,quantity,note)')
    .in('status', ['paid', 'accepted', 'preparing', 'ready']).order('created_at', { ascending: true }).limit(100);
  if (error) return NextResponse.json({ error: 'failed' }, { status: 500 });
  return NextResponse.json({ orders: data });
}
