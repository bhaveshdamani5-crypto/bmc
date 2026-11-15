import { describe, expect, it } from 'vitest';
import { formatRupees, rupeesToPaise } from '@/lib/money';

describe('formatRupees', () => {
  it('formats whole rupees without decimals', () => {
    expect(formatRupees(17000)).toBe('₹170');
  });
  it('keeps paise when present', () => {
    expect(formatRupees(17050)).toBe('₹170.50');
    expect(formatRupees(5)).toBe('₹0.05');
  });
  it('uses Indian digit grouping', () => {
    expect(formatRupees(123456700)).toBe('₹12,34,567');
  });
  it('handles zero and negatives', () => {
    expect(formatRupees(0)).toBe('₹0');
    expect(formatRupees(-2500)).toBe('-₹25');
  });
  it('rejects non-integer paise (floats are a bug)', () => {
    expect(() => formatRupees(10.5)).toThrow();
  });
});

describe('rupeesToPaise', () => {
  it('rounds float noise away', () => {
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
    expect(rupeesToPaise(170)).toBe(17000);
  });
});
