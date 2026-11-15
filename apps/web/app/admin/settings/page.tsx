import { requireManager } from '@/lib/auth/require';
import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/admin/settings-form';

export default async function SettingsPage() {
  await requireManager();
  const { data: r } = await (await createClient()).from('restaurants')
    .select('name,phone,address,gstin,tax_rate_bps,prices_include_tax,accepting_orders,brand_color').single();
  if (!r) return <p>Restaurant not found.</p>;
  return <SettingsForm initial={{ name: r.name, phone: r.phone ?? '', address: r.address ?? '', gstin: r.gstin ?? '', taxPercent: String(r.tax_rate_bps / 100),
    pricesIncludeTax: r.prices_include_tax, acceptingOrders: r.accepting_orders, brandColor: r.brand_color }} />;
}
