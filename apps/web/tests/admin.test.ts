import { describe, expect, it } from 'vitest';
import { summarize } from '@/lib/admin/reports';
import { parseRupeesToPaise } from '@/lib/money';

describe('parseRupeesToPaise', () => {
  it('parses whole and decimal rupees', () => { expect(parseRupeesToPaise('170')).toBe(17000); expect(parseRupeesToPaise(' 99.5 ')).toBe(9950); });
  it('rejects junk, negatives and too many decimals', () => {
    for (const bad of ['', 'abc', '-5', '1.234', '1e3', '12,5', '9999999']) expect(parseRupeesToPaise(bad)).toBeNull();
  });
});

describe('summarize', () => {
  const now = new Date('2026-11-15T10:00:00Z'); // 15:30 IST on 15 Nov
  const orders = [
    { id: 'a', created_at: '2026-11-15T04:00:00Z', total_paise: 20000 },
    { id: 'b', created_at: '2026-11-15T06:00:00Z', total_paise: 10000 },
    { id: 'c', created_at: '2026-11-14T06:00:00Z', total_paise: 5000 },
    { id: 'old', created_at: '2026-10-01T06:00:00Z', total_paise: 99999 },
  ];
  const items = [
    { order_id: 'a', name_snapshot: 'Tea', quantity: 2 }, { order_id: 'b', name_snapshot: 'Tea', quantity: 1 },
    { order_id: 'c', name_snapshot: 'Brownie', quantity: 1 }, { order_id: 'old', name_snapshot: 'Ghost', quantity: 50 },
  ];
  const s = summarize(orders, items, 'Asia/Kolkata', now);
  it("totals today's sales and average order value", () => { expect(s.today).toMatchObject({ total: 30000, count: 2 }); expect(s.aovPaise).toBe(15000); });
  it('buckets yesterday separately and ignores orders outside 7 days', () => { expect(s.days[5].total).toBe(5000); expect(s.days.reduce((n, d) => n + d.total, 0)).toBe(35000); });
  it('ranks top items by quantity within the window only', () => { expect(s.top[0]).toEqual({ name: 'Tea', quantity: 3 }); expect(s.top.some((t) => t.name === 'Ghost')).toBe(false); });
  it('uses the restaurant timezone for day boundaries', () => {
    const late = summarize([{ id: 'x', created_at: '2026-11-14T19:00:00Z', total_paise: 100 }], [], 'Asia/Kolkata', now); // 00:30 IST on the 15th
    expect(late.today.total).toBe(100);
  });
});
