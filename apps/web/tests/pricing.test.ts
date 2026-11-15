import { describe, expect, it } from 'vitest';
import { computeTotals, PricingError, unitPrice } from '@/lib/orders/pricing';
import type { MenuItem } from '@/lib/menu/types';

const pasta: MenuItem = {
  id: 'i1', name: 'Penne Alfredo', description: null, basePricePaise: 25000, calories: null, isVeg: null, isAvailable: true,
  variants: [{ id: 'v', name: 'Veg', deltaPaise: 0, calories: null, isVeg: true }, { id: 'c', name: 'Chicken', deltaPaise: 3000, calories: null, isVeg: false }],
  groups: [{ id: 'g', name: 'Side', min: 1, max: 1, options: [{ id: 'm', name: 'Mash', deltaPaise: 0 }, { id: 'r', name: 'Rice', deltaPaise: 2000 }] }],
};

describe('unitPrice', () => {
  it('adds variant and modifier deltas', () => expect(unitPrice(pasta, { variantId: 'c', optionIds: ['r'] })).toBe(30000));
  it('requires a variant when the item has them', () => expect(() => unitPrice(pasta, { optionIds: ['m'] })).toThrow(PricingError));
  it('enforces min and max per modifier group', () => {
    expect(() => unitPrice(pasta, { variantId: 'v', optionIds: [] })).toThrow(PricingError);
    expect(() => unitPrice(pasta, { variantId: 'v', optionIds: ['m', 'r'] })).toThrow(PricingError);
  });
  it('rejects unknown option ids (tampering)', () => expect(() => unitPrice(pasta, { variantId: 'v', optionIds: ['m', 'zzz'] })).toThrow(PricingError));
  it('rejects sold-out items', () => expect(() => unitPrice({ ...pasta, isAvailable: false }, { variantId: 'v', optionIds: ['m'] })).toThrow(/sold out/));
});

describe('computeTotals', () => {
  const lines = [{ unitPaise: 17000, qty: 2 }, { unitPaise: 9000, qty: 1 }];
  it('inclusive tax: total equals subtotal, tax is the embedded portion', () =>
    expect(computeTotals(lines, 500, true)).toEqual({ subtotalPaise: 43000, taxPaise: 2048, totalPaise: 43000 }));
  it('exclusive tax: tax is added on top', () =>
    expect(computeTotals(lines, 500, false)).toEqual({ subtotalPaise: 43000, taxPaise: 2150, totalPaise: 45150 }));
  it('empty cart is zero', () => expect(computeTotals([], 500, true).totalPaise).toBe(0));
});
