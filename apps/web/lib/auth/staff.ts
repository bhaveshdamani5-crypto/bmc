import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type Staff = { userId: string; restaurantId: string; role: 'owner' | 'manager' | 'kitchen' | 'captain' };

/** The logged-in staff member (from the session cookie) or null. */
export async function getStaff(): Promise<Staff | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('staff_users').select('restaurant_id,role').eq('id', user.id).maybeSingle();
  return data ? { userId: user.id, restaurantId: data.restaurant_id, role: data.role } : null;
}
