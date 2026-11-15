export type OrderRow = { id: string; created_at: string; total_paise: number };
export type ItemRow = { order_id: string; name_snapshot: string; quantity: number };

export const dayKey = (d: Date | string, tz: string) => new Date(d).toLocaleDateString('en-CA', { timeZone: tz });

/** Sales summary for the last 7 local days (today last). Pass only orders that count as sales. */
export function summarize(orders: OrderRow[], items: ItemRow[], tz: string, now = new Date()) {
  const days = Array.from({ length: 7 }, (_, n) => ({ day: dayKey(new Date(now.getTime() - (6 - n) * 864e5), tz), total: 0, count: 0 }));
  const inWindow = new Set<string>();
  for (const o of orders) {
    const d = days.find((x) => x.day === dayKey(o.created_at, tz));
    if (d) { d.total += o.total_paise; d.count += 1; inWindow.add(o.id); }
  }
  const qty = new Map<string, number>();
  for (const i of items) if (inWindow.has(i.order_id)) qty.set(i.name_snapshot, (qty.get(i.name_snapshot) ?? 0) + i.quantity);
  const top = [...qty.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([name, quantity]) => ({ name, quantity }));
  const today = days[6];
  return { today, aovPaise: today.count ? Math.round(today.total / today.count) : 0, days, top };
}
