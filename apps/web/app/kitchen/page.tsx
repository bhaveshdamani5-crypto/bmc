import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getStaff } from '@/lib/auth/staff';
import { isSupabaseConfigured } from '@/lib/env';
import { KitchenBoard } from '@/components/kitchen-board';

export default async function KitchenPage() {
  await connection();
  return <Suspense fallback={<p className="p-8">Loading…</p>}><Gate /></Suspense>;
}
async function Gate() {
  if (!isSupabaseConfigured()) return <p className="p-8">Connect Supabase first (docs/SETUP.md).</p>;
  const staff = await getStaff();
  if (!staff) redirect('/login');
  return <KitchenBoard />;
}
