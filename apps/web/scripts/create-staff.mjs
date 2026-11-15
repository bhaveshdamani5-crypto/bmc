// Usage (from apps/web): node --env-file=.env.local scripts/create-staff.mjs <email> <password> <owner|manager|kitchen|captain> <restaurant-slug>
import { createClient } from '@supabase/supabase-js';
const [email, password, role, slug] = process.argv.slice(2);
if (!email || !password || !role || !slug) { console.error('Usage: create-staff.mjs <email> <password> <role> <restaurant-slug>'); process.exit(1); }
if (!['owner', 'manager', 'kitchen', 'captain'].includes(role)) { console.error('role must be owner, manager, kitchen or captain'); process.exit(1); }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: r } = await db.from('restaurants').select('id,name').eq('slug', slug).maybeSingle();
if (!r) { console.error(`No restaurant with slug "${slug}". Did you load the seed?`); process.exit(1); }
const { data: u, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (error) { console.error('Could not create user:', error.message); process.exit(1); }
const { error: e2 } = await db.from('staff_users').insert({ id: u.user.id, restaurant_id: r.id, role });
if (e2) { console.error('User created but staff row failed:', e2.message); process.exit(1); }
console.log(`Created ${role} ${email} for ${r.name}`);
