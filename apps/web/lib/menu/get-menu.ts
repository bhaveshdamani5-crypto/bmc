import 'server-only';
import { isSupabaseConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import demo from './demo-menu.json';
import type { MenuCategory, TableContext } from './types';

/** Resolve a scanned QR (slug + table token) to the restaurant, table and live menu. Null = invalid QR. */
export async function getTableMenu(slug: string, token: string): Promise<TableContext | null> {
  if (!isSupabaseConfigured()) return demoContext(slug, token);
  const db = createAdminClient();
  const { data: r } = await db.from('restaurants')
    .select('id,slug,name,brand_color,tax_rate_bps,prices_include_tax,accepting_orders').eq('slug', slug).maybeSingle();
  if (!r) return null;
  const { data: t } = await db.from('tables').select('id,label')
    .eq('restaurant_id', r.id).eq('token', token).eq('is_active', true).maybeSingle();
  if (!t) return null;

  // Service-role client bypasses RLS, so EVERY query filters by restaurant_id.
  const q = (table: string) => db.from(table).select('*').eq('restaurant_id', r.id);
  const [cats, items, vars, groups, mods] = await Promise.all([
    q('categories').eq('is_active', true), q('items').eq('is_deleted', false),
    q('item_variants'), q('modifier_groups'), q('modifiers'),
  ]);
  const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;
  const categories: MenuCategory[] = (cats.data ?? []).sort(bySort).map((c) => ({
    id: c.id, name: c.name, tagline: c.tagline,
    items: (items.data ?? []).filter((i) => i.category_id === c.id).sort(bySort).map((i) => ({
      id: i.id, name: i.name, description: i.description, basePricePaise: i.base_price_paise,
      calories: i.calories, isVeg: i.is_veg, isAvailable: i.is_available,
      variants: (vars.data ?? []).filter((v) => v.item_id === i.id).sort(bySort).map((v) => ({
        id: v.id, name: v.name, deltaPaise: v.price_delta_paise, calories: v.calories, isVeg: v.is_veg })),
      groups: (groups.data ?? []).filter((g) => g.item_id === i.id).sort(bySort).map((g) => ({
        id: g.id, name: g.name, min: g.min_select, max: g.max_select,
        options: (mods.data ?? []).filter((m) => m.group_id === g.id && m.is_available).sort(bySort)
          .map((m) => ({ id: m.id, name: m.name, deltaPaise: m.price_delta_paise })) })),
    })),
  })).filter((c) => c.items.length > 0);
  return {
    restaurant: { id: r.id, slug: r.slug, name: r.name, brandColor: r.brand_color, taxRateBps: r.tax_rate_bps,
      pricesIncludeTax: r.prices_include_tax, acceptingOrders: r.accepting_orders },
    table: { id: t.id, label: t.label }, categories,
  };
}

/** No-database demo mode: slug brew-moon, tokens devtoken-brew-01..10. */
function demoContext(slug: string, token: string): TableContext | null {
  const m = /^devtoken-brew-(\d\d)$/.exec(token);
  if (slug !== 'brew-moon' || !m) return null;
  return {
    restaurant: { id: 'demo', slug, name: 'The Brew Moon Cafe', brandColor: '#d4a24c', taxRateBps: 500, pricesIncludeTax: true, acceptingOrders: true },
    table: { id: `demo-t${m[1]}`, label: `T${Number(m[1])}` },
    categories: demo as MenuCategory[],
  };
}
