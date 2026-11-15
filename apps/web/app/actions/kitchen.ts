'use server';
import { getStaff } from '@/lib/auth/staff';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { transitionOrder } from '@/lib/orders/transition';
import type { OrderStatus } from '@/lib/orders/state-machine';

const KITCHEN_MOVES: OrderStatus[] = ['accepted', 'preparing', 'ready', 'served', 'completed', 'refund_pending'];

export async function kitchenTransition(orderId: string, to: OrderStatus, reason?: string) {
  const staff = await getStaff();
  if (!staff) return { ok: false as const, error: 'Please sign in again.' };
  if (!KITCHEN_MOVES.includes(to)) return { ok: false as const, error: 'Not allowed.' };
  return transitionOrder(createAdminClient(), { orderId, restaurantId: staff.restaurantId, to, actor: staff.userId, reason });
}

export async function setAvailability(itemId: string, available: boolean) {
  if (!(await getStaff())) return { ok: false as const, error: 'Please sign in again.' };
  const { error } = await (await createClient()).rpc('set_item_availability', { p_item_id: itemId, p_available: available });
  return error ? { ok: false as const, error: 'Could not update item.' } : { ok: true as const };
}
