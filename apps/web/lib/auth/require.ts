import 'server-only';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getStaff } from './staff';

/** Page guard: owner/manager only. Kitchen and captain staff are sent to the kitchen screen. */
export async function requireManager() {
  await connection(); // always request-time: never prerender pages that need a logged-in user
  const s = await getStaff();
  if (!s) redirect('/login');
  if (s.role !== 'owner' && s.role !== 'manager') redirect('/kitchen');
  return s;
}
