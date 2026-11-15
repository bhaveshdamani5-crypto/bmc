import QRCode from 'qrcode';
import { requireManager } from '@/lib/auth/require';
import { createClient } from '@/lib/supabase/server';
import { TablesManager } from '@/components/admin/tables-manager';

export default async function TablesPage() {
  await requireManager();
  const sb = await createClient();
  const [{ data: r }, { data: tables }] = await Promise.all([
    sb.from('restaurants').select('slug,name').single(),
    sb.from('tables').select('id,label,token,is_active').order('label'),
  ]);
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const rows = await Promise.all((tables ?? []).map(async (t) => {
    const url = `${base}/${r?.slug}/t/${t.token}`;
    return { id: t.id, label: t.label, active: t.is_active, url, svg: await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) };
  }));
  return <TablesManager cafeName={r?.name ?? ''} rows={rows} />;
}
