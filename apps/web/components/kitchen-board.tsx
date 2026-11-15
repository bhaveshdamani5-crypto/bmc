'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kitchenTransition, setAvailability } from '@/app/actions/kitchen';
import type { OrderStatus } from '@/lib/orders/state-machine';

type Line = { name_snapshot: string; variant_snapshot: string | null; modifiers_snapshot: string[]; quantity: number; note: string | null };
type Order = { id: string; order_number: number; status: OrderStatus; created_at: string; guest_note: string | null; tables: { label: string } | null; order_items: Line[] };
type Stock = { id: string; name: string; is_available: boolean };

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  paid: { to: 'accepted', label: 'Accept' }, accepted: { to: 'preparing', label: 'Start preparing' },
  preparing: { to: 'ready', label: 'Mark ready' }, ready: { to: 'served', label: 'Mark served' },
};
const COLUMNS: { title: string; statuses: OrderStatus[] }[] = [
  { title: 'New', statuses: ['paid'] }, { title: 'In the kitchen', statuses: ['accepted', 'preparing'] }, { title: 'Ready to serve', statuses: ['ready'] },
];

function beep() {
  try {
    const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.2; o.start(); o.stop(ctx.currentTime + 0.35);
  } catch { /* audio unavailable */ }
}
const minutes = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

export function KitchenBoard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastOk, setLastOk] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState<'orders' | 'stock'>('orders');
  const [msg, setMsg] = useState('');
  const seen = useRef<Set<string> | null>(null);
  const startedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/kitchen/orders', { cache: 'no-store' });
      if (r.status === 401) { router.push('/login'); return; }
      if (!r.ok) return;
      const { orders: list } = (await r.json()) as { orders: Order[] };
      const fresh = list.filter((o) => o.status === 'paid').map((o) => o.id);
      if (seen.current && startedRef.current && fresh.some((id) => !seen.current!.has(id))) beep();
      seen.current = new Set(list.map((o) => o.id));
      setOrders(list); setLastOk(Date.now());
    } catch { /* offline: the red banner shows */ }
  }, [router]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const poll = setInterval(load, 5000);              // safety net if realtime drops
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const sb = createClient();
    const ch = sb.channel('kitchen-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load()).subscribe();
    return () => { clearTimeout(first); clearInterval(poll); clearInterval(tick); sb.removeChannel(ch); };
  }, [load]);

  const connected = now - lastOk < 15000;
  async function move(id: string, to: OrderStatus, reason?: string) {
    setMsg(''); const r = await kitchenTransition(id, to, reason);
    if (!r.ok) setMsg(r.error); await load();
  }

  return (
    <div className="min-h-screen bg-[#1d1d20] p-4 text-[#f1ece2]">
      {!connected && <p role="alert" className="mb-3 rounded-lg bg-red-700 p-3 text-center font-semibold">Connection lost. New orders may not appear. Check the internet.</p>}
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Georgia, serif' }}>Kitchen</h1>
        <span className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} aria-label={connected ? 'Connected' : 'Disconnected'} />
        {!started && <button onClick={() => { startedRef.current = true; setStarted(true); beep(); }} className="min-h-12 rounded-lg bg-[#d4a24c] px-5 font-semibold text-[#26262a]">Start shift (turn on sound)</button>}
        <div className="ml-auto flex gap-2">
          {(['orders', 'stock'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`min-h-12 rounded-lg border px-4 ${tab === t ? 'border-[#d4a24c] text-[#d4a24c]' : 'border-[#44444b]'}`}>{t === 'orders' ? 'Orders' : 'Out of stock'}</button>)}
        </div>
      </div>
      {msg && <p className="mb-3 rounded-lg bg-[#4a2f2f] p-3">{msg}</p>}
      {tab === 'stock' ? <StockList /> : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const list = orders.filter((o) => col.statuses.includes(o.status));
            return (
              <section key={col.title} aria-label={col.title}>
                <h2 className="mb-2 text-lg text-[#b9b2a3]">{col.title} ({list.length})</h2>
                {list.length === 0 && <p className="rounded-lg border border-dashed border-[#44444b] p-6 text-center text-[#8d877b]">No orders</p>}
                {list.map((o) => {
                  const age = minutes(o.created_at); const act = NEXT[o.status];
                  return (
                    <article key={o.id} className={`mb-3 rounded-xl border p-4 ${age >= 15 ? 'border-red-500' : 'border-[#44444b]'} bg-[#2a2a2f]`}>
                      <div className="flex items-baseline justify-between"><p className="text-2xl font-semibold">#{o.order_number} · {o.tables?.label ?? '?'}</p><p className={age >= 15 ? 'text-red-400' : 'text-[#b9b2a3]'}>{age} min</p></div>
                      <ul className="my-2 space-y-1">{o.order_items.map((l, i) => (
                        <li key={i}><span className="font-semibold">{l.quantity}×</span> {l.name_snapshot}
                          {(l.variant_snapshot || l.modifiers_snapshot?.length > 0) && <span className="text-[#b9b2a3]"> ({[l.variant_snapshot, ...(l.modifiers_snapshot ?? [])].filter(Boolean).join(', ')})</span>}
                          {l.note && <span className="block text-sm text-[#d4a24c]">Note: {l.note}</span>}</li>))}</ul>
                      {o.guest_note && <p className="mb-2 rounded bg-[#3a3326] p-2 text-sm text-[#d4a24c]">Guest note: {o.guest_note}</p>}
                      <div className="flex gap-2">
                        {act && <button onClick={() => move(o.id, act.to)} className="min-h-14 flex-1 rounded-lg bg-[#d4a24c] text-lg font-semibold text-[#26262a]">{act.label}</button>}
                        {(o.status === 'paid' || o.status === 'accepted') && <button onClick={() => confirm('Reject this order and refund the guest?') && move(o.id, 'refund_pending', 'Rejected by kitchen')} className="min-h-14 rounded-lg border border-red-500 px-4 text-red-400">Reject</button>}
                      </div>
                    </article>);
                })}
              </section>);
          })}
        </div>)}
    </div>
  );
}

function StockList() {
  const [items, setItems] = useState<Stock[]>([]); const [q, setQ] = useState('');
  useEffect(() => { createClient().from('items').select('id,name,is_available').eq('is_deleted', false).order('name').then(({ data }) => setItems((data as Stock[]) ?? [])); }, []);
  async function toggle(i: Stock) {
    setItems((cur) => cur.map((x) => x.id === i.id ? { ...x, is_available: !x.is_available } : x));
    const r = await setAvailability(i.id, !i.is_available);
    if (!r.ok) setItems((cur) => cur.map((x) => x.id === i.id ? { ...x, is_available: i.is_available } : x));
  }
  const shown = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" aria-label="Search items" className="mb-3 w-full rounded-lg border border-[#44444b] bg-[#2a2a2f] px-4 py-3" />
      <ul className="divide-y divide-[#3a3a41]">{shown.map((i) => (
        <li key={i.id} className="flex items-center justify-between py-3"><span className={i.is_available ? '' : 'text-[#8d877b] line-through'}>{i.name}</span>
          <button onClick={() => toggle(i)} className={`min-h-12 min-w-32 rounded-lg border px-4 ${i.is_available ? 'border-[#44444b]' : 'border-red-500 text-red-400'}`}>{i.is_available ? 'Mark sold out' : 'Back in stock'}</button></li>))}</ul>
    </div>
  );
}
