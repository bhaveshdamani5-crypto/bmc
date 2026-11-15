/** All money in this app is integer PAISE. Convert only at the display edge. */

export function formatRupees(paise: number): string {
  if (!Number.isInteger(paise)) throw new Error(`paise must be an integer, got ${paise}`);
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  const grouped = new Intl.NumberFormat('en-IN').format(rupees);
  const text = rem === 0 ? grouped : `${grouped}.${String(rem).padStart(2, '0')}`;
  return `${negative ? '-' : ''}₹${text}`;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
