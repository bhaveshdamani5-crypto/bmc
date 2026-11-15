// Usage (from apps/web): node --env-file=.env.local scripts/make-qr.mjs <restaurant-slug> [base-url]
// Writes one PNG per table into ./qr/. Print them on table stands.
import { mkdirSync } from 'node:fs';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
const [slug, base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'] = process.argv.slice(2);
if (!slug) { console.error('Usage: make-qr.mjs <restaurant-slug> [base-url]'); process.exit(1); }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: r } = await db.from('restaurants').select('id').eq('slug', slug).maybeSingle();
if (!r) { console.error(`No restaurant "${slug}"`); process.exit(1); }
const { data: tables } = await db.from('tables').select('label,token').eq('restaurant_id', r.id).eq('is_active', true).order('label');
mkdirSync('qr', { recursive: true });
for (const t of tables ?? []) {
  const url = `${base.replace(/\/$/, '')}/${slug}/t/${t.token}`;
  await QRCode.toFile(`qr/${slug}-${t.label}.png`, url, { width: 800, margin: 2, errorCorrectionLevel: 'M' });
  console.log(`${t.label}: ${url}`);
}
