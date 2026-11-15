'use server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { getStaff } from '@/lib/auth/staff';
import { createClient } from '@/lib/supabase/server';
import { parseRupeesToPaise } from '@/lib/money';

type R = { ok: true } | { ok: false; error: string };
const fail = (error: string): R => ({ ok: false, error });

/** Every action runs as the logged-in owner/manager (RLS enforces the tenant boundary on top of this check). */
async function manager() {
  const s = await getStaff();
  return s && (s.role === 'owner' || s.role === 'manager') ? s : null;
}
const clean = (s?: string | null) => (s && s.trim() ? s.trim() : null);

const itemSchema = z.object({
  id: z.string().uuid().optional(), categoryId: z.string().uuid(), name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(), price: z.string().optional(),
  isVeg: z.enum(['veg', 'nonveg', 'none']), calories: z.string().optional(),
});

export async function saveItem(input: unknown): Promise<R> {
  const s = await manager(); if (!s) return fail('Not allowed.');
  const p = itemSchema.safeParse(input); if (!p.success) return fail('Please check the name and fields.');
  const d = p.data; const sb = await createClient();
  const cal = d.calories?.trim() ? Number(d.calories) : null;
  if (cal !== null && (!Number.isInteger(cal) || cal < 0 || cal > 20000)) return fail('Calories must be a whole number.');
  const row = { name: d.name, description: clean(d.description), calories: cal, is_veg: d.isVeg === 'none' ? null : d.isVeg === 'veg' };
  if (d.id) {
    const patch: Record<string, unknown> = { ...row, category_id: d.categoryId };
    if (d.price?.trim()) { const paise = parseRupeesToPaise(d.price); if (paise === null) return fail('Enter the price as a number, like 170 or 170.50.'); patch.base_price_paise = paise; }
    const { error } = await sb.from('items').update(patch).eq('id', d.id);
    return error ? fail('Could not save the item.') : { ok: true };
  }
  const paise = parseRupeesToPaise(d.price ?? ''); if (paise === null) return fail('Enter the price as a number, like 170 or 170.50.');
  const { error } = await sb.from('items').insert({ ...row, restaurant_id: s.restaurantId, category_id: d.categoryId, base_price_paise: paise, sort_order: 9999 });
  return error ? fail('Could not add the item.') : { ok: true };
}

export async function setItemAvailable(id: string, available: boolean): Promise<R> {
  if (!(await manager())) return fail('Not allowed.');
  const { error } = await (await createClient()).from('items').update({ is_available: available }).eq('id', id);
  return error ? fail('Could not update the item.') : { ok: true };
}
export async function deleteItem(id: string): Promise<R> {   // soft delete: past orders keep their snapshots
  if (!(await manager())) return fail('Not allowed.');
  const { error } = await (await createClient()).from('items').update({ is_deleted: true }).eq('id', id);
  return error ? fail('Could not delete the item.') : { ok: true };
}

export async function saveCategory(input: { id?: string; name: string; tagline?: string }): Promise<R> {
  const s = await manager(); if (!s) return fail('Not allowed.');
  const name = input.name?.trim(); if (!name || name.length > 80) return fail('Give the section a name.');
  const sb = await createClient(); const tagline = clean(input.tagline);
  const { error } = input.id ? await sb.from('categories').update({ name, tagline }).eq('id', input.id)
    : await sb.from('categories').insert({ restaurant_id: s.restaurantId, name, tagline, sort_order: 9999 });
  return error ? fail('Could not save the section.') : { ok: true };
}
export async function hideCategory(id: string): Promise<R> {
  if (!(await manager())) return fail('Not allowed.');
  const { error } = await (await createClient()).from('categories').update({ is_active: false }).eq('id', id);
  return error ? fail('Could not hide the section.') : { ok: true };
}

export async function addTable(label: string): Promise<R> {
  const s = await manager(); if (!s) return fail('Not allowed.');
  const l = label.trim(); if (!l || l.length > 30) return fail('Give the table a short name, like T11.');
  const { error } = await (await createClient()).from('tables').insert({ restaurant_id: s.restaurantId, label: l });
  return error ? fail(error.code === '23505' ? 'A table with that name already exists.' : 'Could not add the table.') : { ok: true };
}
export async function setTableActive(id: string, active: boolean): Promise<R> {
  if (!(await manager())) return fail('Not allowed.');
  const { error } = await (await createClient()).from('tables').update({ is_active: active }).eq('id', id);
  return error ? fail('Could not update the table.') : { ok: true };
}
/** Use if a QR sticker leaks or is photographed: the old code stops working immediately. */
export async function regenerateTableToken(id: string): Promise<R> {
  if (!(await manager())) return fail('Not allowed.');
  const { error } = await (await createClient()).from('tables').update({ token: randomBytes(12).toString('hex') }).eq('id', id);
  return error ? fail('Could not change the QR code.') : { ok: true };
}

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(100), phone: z.string().max(30).optional(), address: z.string().max(300).optional(),
  gstin: z.string().trim().toUpperCase().regex(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, 'That GSTIN does not look right.').optional(),
  taxPercent: z.number().min(0).max(28), pricesIncludeTax: z.boolean(), acceptingOrders: z.boolean(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a color like #d4a24c.'),
});
export async function saveSettings(input: unknown): Promise<R> {
  const s = await manager(); if (!s) return fail('Not allowed.');
  const p = settingsSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? 'Please check the fields.');
  const d = p.data;
  const { error } = await (await createClient()).from('restaurants').update({
    name: d.name, phone: clean(d.phone), address: clean(d.address), gstin: clean(d.gstin),
    tax_rate_bps: Math.round(d.taxPercent * 100), prices_include_tax: d.pricesIncludeTax, accepting_orders: d.acceptingOrders, brand_color: d.brandColor,
  }).eq('id', s.restaurantId);
  return error ? fail('Could not save settings.') : { ok: true };
}
