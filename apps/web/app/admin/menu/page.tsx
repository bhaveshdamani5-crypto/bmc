import { requireManager } from '@/lib/auth/require';
import { createClient } from '@/lib/supabase/server';
import { MenuEditor } from '@/components/admin/menu-editor';

export default async function MenuPage() {
  await requireManager();
  const sb = await createClient();
  const [c, i, v] = await Promise.all([
    sb.from('categories').select('id,name,tagline').eq('is_active', true).order('sort_order'),
    sb.from('items').select('id,category_id,name,description,base_price_paise,calories,is_veg,is_available').eq('is_deleted', false).order('sort_order'),
    sb.from('item_variants').select('item_id'),
  ]);
  const optionCount: Record<string, number> = {};
  (v.data ?? []).forEach((x) => { optionCount[x.item_id] = (optionCount[x.item_id] ?? 0) + 1; });
  return <MenuEditor categories={c.data ?? []} items={i.data ?? []} optionCount={optionCount} />;
}
