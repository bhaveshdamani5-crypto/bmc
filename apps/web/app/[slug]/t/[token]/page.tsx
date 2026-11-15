import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTableMenu } from '@/lib/menu/get-menu';
import { MenuClient } from '@/components/menu-client';

export default function TablePage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#b9b2a3]">Loading menu…</div>}>
      <Loader params={params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const ctx = await getTableMenu(slug, token);
  if (!ctx) notFound();
  return <MenuClient ctx={ctx} token={token} />;
}
