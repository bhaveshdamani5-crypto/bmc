import { Suspense } from 'react';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';

const links = [['/admin', 'Overview'], ['/admin/menu', 'Menu'], ['/admin/tables', 'Tables & QR'], ['/admin/settings', 'Settings'], ['/kitchen', 'Kitchen screen']];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-2 print:hidden" aria-label="Admin">
        {links.map(([href, label]) => <Link key={href} href={href} className="shrink-0 rounded-lg px-4 py-3 text-sm hover:bg-zinc-100">{label}</Link>)}
      </nav>
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        {isSupabaseConfigured() ? <Suspense fallback={<p className="py-8">Loading…</p>}>{children}</Suspense> : <p>Connect Supabase first (docs/SETUP.md).</p>}
      </div>
    </div>
  );
}
