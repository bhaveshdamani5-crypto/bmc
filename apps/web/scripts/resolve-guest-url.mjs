import { createClient } from '@supabase/supabase-js';

const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const configured = process.env.NEXT_PUBLIC_SUPABASE_URL
  && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  && process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!configured) {
  console.log(`${base}/brew-moon/t/devtoken-brew-01`);
} else {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: restaurants, error: restaurantError } = await db.from('restaurants').select('id,slug');
  if (restaurantError) throw new Error(`Could not resolve the restaurant for the customer page: ${restaurantError.message}`);
  const requestedSlug = process.env.TABLETAP_RESTAURANT_SLUG;
  const restaurant = requestedSlug
    ? restaurants.find(({ slug }) => slug === requestedSlug)
    : restaurants.find(({ slug }) => slug === 'brew-moon') ?? (restaurants.length === 1 ? restaurants[0] : null);
  if (!restaurant) throw new Error(`Set TABLETAP_RESTAURANT_SLUG to one of: ${restaurants.map(({ slug }) => slug).join(', ')}`);

  const { data: table, error: tableError } = await db.from('tables')
    .select('token').eq('restaurant_id', restaurant.id).eq('is_active', true).order('label').limit(1).single();
  if (tableError) throw new Error(`Could not resolve an active table for the customer page: ${tableError.message}`);

  console.log(`${base}/${restaurant.slug}/t/${table.token}`);
}
