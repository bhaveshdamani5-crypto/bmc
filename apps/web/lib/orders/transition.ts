import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkTransition, type OrderStatus } from './state-machine';

type Result = { ok: true; changed: boolean } | { ok: false; error: string };

/** The ONLY place order status changes. Legal moves only, race-safe, audited. Pass the service-role client. */
export async function transitionOrder(
  db: SupabaseClient,
  a: { orderId: string; restaurantId: string; to: OrderStatus; actor: string; reason?: string },
): Promise<Result> {
  const { data: o } = await db.from('orders').select('id,status').eq('id', a.orderId).eq('restaurant_id', a.restaurantId).maybeSingle();
  if (!o) return { ok: false, error: 'Order not found' };
  let kind: 'ok' | 'same';
  try { kind = checkTransition(o.status as OrderStatus, a.to); } catch (e) { return { ok: false, error: (e as Error).message }; }
  if (kind === 'same') return { ok: true, changed: false };

  const patch: Record<string, unknown> = { status: a.to };
  if (a.to === 'paid') patch.paid_at = new Date().toISOString();
  // `.eq('status', o.status)` makes the update fail if someone else moved the order first.
  const { data: upd } = await db.from('orders').update(patch).eq('id', a.orderId).eq('restaurant_id', a.restaurantId).eq('status', o.status).select('id');
  if (!upd?.length) return { ok: false, error: 'This order was just changed. Refresh and try again.' };
  await db.from('order_events').insert({ restaurant_id: a.restaurantId, order_id: a.orderId, from_status: o.status, to_status: a.to, actor: a.actor, reason: a.reason ?? null });
  return { ok: true, changed: true };
}
