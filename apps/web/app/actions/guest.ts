'use server';
import { createOrder } from '@/lib/orders/create-order';
import { transitionOrder } from '@/lib/orders/transition';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/env';

/** Dev-only fake payment. Hard-blocked in production. Replaced by the real gateway in Step 5. */
const simulateAllowed = () => process.env.DEV_SIMULATE_PAYMENT === 'true' && process.env.NODE_ENV !== 'production';

export async function placeOrder(input: unknown): Promise<{ ok: true; orderId: string; accessToken: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Connect Supabase to place orders (see docs/SETUP.md).' };
  if (!simulateAllowed()) return { ok: false, error: 'Online payment is not connected yet.' };
  const res = await createOrder(input);
  if (!res.ok) return res;
  const t = await transitionOrder(createAdminClient(), { orderId: res.orderId, restaurantId: res.restaurantId, to: 'paid', actor: 'dev-simulator' });
  if (!t.ok) return { ok: false, error: t.error };
  return { ok: true, orderId: res.orderId, accessToken: res.accessToken };
}
