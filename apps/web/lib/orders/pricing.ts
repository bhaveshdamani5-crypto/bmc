import type { MenuItem } from '@/lib/menu/types';

export class PricingError extends Error {}
export type Selection = { variantId?: string | null; optionIds: string[] };

/** Unit price in paise for one item + choices. Throws PricingError on any invalid selection.
 *  The SERVER must call this again at checkout using database prices; never trust client totals. */
export function unitPrice(item: MenuItem, sel: Selection): number {
  if (!item.isAvailable) throw new PricingError(`${item.name} is sold out`);
  let price = item.basePricePaise;
  if (item.variants.length > 0) {
    const v = item.variants.find((x) => x.id === sel.variantId);
    if (!v) throw new PricingError(`Choose an option for ${item.name}`);
    price += v.deltaPaise;
  } else if (sel.variantId) {
    throw new PricingError('Invalid option');
  }
  const known = new Set(item.groups.flatMap((g) => g.options.map((o) => o.id)));
  if (sel.optionIds.some((id) => !known.has(id))) throw new PricingError('Invalid add-on');
  for (const g of item.groups) {
    const chosen = g.options.filter((o) => sel.optionIds.includes(o.id));
    if (chosen.length < g.min) throw new PricingError(`Choose ${g.name}`);
    if (chosen.length > g.max) throw new PricingError(`Too many choices for ${g.name}`);
    price += chosen.reduce((s, o) => s + o.deltaPaise, 0);
  }
  return price;
}

/** Totals in paise. Inclusive: menu prices already contain tax (total = subtotal). Exclusive: tax is added. */
export function computeTotals(lines: { unitPaise: number; qty: number }[], taxBps: number, inclusive: boolean) {
  const subtotal = lines.reduce((s, l) => s + l.unitPaise * l.qty, 0);
  const tax = inclusive ? Math.round((subtotal * taxBps) / (10000 + taxBps)) : Math.round((subtotal * taxBps) / 10000);
  return { subtotalPaise: subtotal, taxPaise: tax, totalPaise: inclusive ? subtotal : subtotal + tax };
}
