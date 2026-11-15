import { requireManager } from '@/lib/auth/require';
import { createClient } from '@/lib/supabase/server';
import { summarize } from '@/lib/admin/reports';
import { formatRupees } from '@/lib/money';

const daysAgoIso = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
const SALES = ['paid', 'accepted', 'preparing', 'ready', 'served', 'completed'];

export default async function Overview() {
  await requireManager();
  const sb = await createClient();
  const { data: r } = await sb.from('restaurants').select('name,timezone').single();
  const since = daysAgoIso(8);
  const { data: orders } = await sb.from('orders').select('id,created_at,total_paise').in('status', SALES).gte('created_at', since).limit(5000);
  const ids = (orders ?? []).map((o) => o.id);
  const { data: items } = ids.length ? await sb.from('order_items').select('order_id,name_snapshot,quantity').in('order_id', ids.slice(0, 1000)) : { data: [] };
  const s = summarize(orders ?? [], items ?? [], r?.timezone ?? 'Asia/Kolkata');
  const max = Math.max(1, ...s.days.map((d) => d.total));
  const card = 'rounded-xl border border-zinc-200 bg-white p-4';
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{r?.name ?? 'Overview'}</h1>
      <div className="grid grid-cols-3 gap-3">
        <div className={card}><p className="text-sm text-zinc-500">Today’s sales</p><p className="text-2xl font-semibold">{formatRupees(s.today.total)}</p></div>
        <div className={card}><p className="text-sm text-zinc-500">Orders today</p><p className="text-2xl font-semibold">{s.today.count}</p></div>
        <div className={card}><p className="text-sm text-zinc-500">Average order</p><p className="text-2xl font-semibold">{formatRupees(s.aovPaise)}</p></div>
      </div>
      <section className={card}><h2 className="mb-3 font-medium">Last 7 days</h2>
        <div className="flex h-36 items-end gap-2">{s.days.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t bg-amber-500" style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }} title={`${formatRupees(d.total)} · ${d.count} orders`} />
            <span className="text-xs text-zinc-500">{d.day.slice(5)}</span></div>))}</div></section>
      <section className={card}><h2 className="mb-2 font-medium">Top items this week</h2>
        {s.top.length === 0 ? <p className="text-zinc-500">No paid orders yet.</p> : <ol className="divide-y divide-zinc-100">{s.top.map((t) => <li key={t.name} className="flex justify-between py-2"><span>{t.name}</span><span className="text-zinc-500">{t.quantity} sold</span></li>)}</ol>}</section>
    </div>
  );
}
