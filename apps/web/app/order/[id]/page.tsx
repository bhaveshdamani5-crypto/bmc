import { Suspense } from 'react';
import { OrderStatus } from '@/components/order-status';

export default function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  return <Suspense fallback={<p className="p-8 text-center">Loading…</p>}><Inner params={params} searchParams={searchParams} /></Suspense>;
}
async function Inner({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params; const { t } = await searchParams;
  return <OrderStatus id={id} token={t ?? ''} />;
}
