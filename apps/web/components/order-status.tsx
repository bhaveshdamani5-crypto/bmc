'use client';
import { useEffect, useState } from 'react';
import { formatRupees } from '@/lib/money';

const STEPS: Record<string, string> = {
  pending_payment: 'Waiting for payment', paid: 'Order received', accepted: 'Order accepted', preparing: 'Being prepared',
  ready: 'Ready, on its way to your table', served: 'Enjoy your meal', completed: 'Completed',
  refund_pending: 'Cancelled. Your refund is on its way', refunded: 'Refunded', cancelled: 'Cancelled', expired: 'Expired',
};

export function OrderStatus({ id, token }: { id: string; token: string }) {
  const [o, setO] = useState<{ order_number: number; status: string; total_paise: number } | null>(null);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/order-status?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (stop) return; if (r.status === 404 || r.status === 400) { setBad(true); return; }
        if (r.ok) setO(await r.json());
      } catch { /* keep polling */ }
    };
    tick(); const h = setInterval(tick, 3000); return () => { stop = true; clearInterval(h); };
  }, [id, token]);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 bg-[#26262a] p-8 text-center text-[#f1ece2]">
      {bad ? <p>We couldn’t find this order. Please ask a member of staff.</p> : !o ? <p>Loading your order…</p> : (<>
        <p className="text-sm text-[#b9b2a3]">Order number</p>
        <p className="text-6xl font-semibold" style={{ fontFamily: 'Georgia, serif' }}>{o.order_number}</p>
        <p className="text-xl" aria-live="polite">{STEPS[o.status] ?? o.status}</p>
        <p className="text-sm text-[#b9b2a3]">Total {formatRupees(o.total_paise)}</p>
      </>)}
    </main>
  );
}
