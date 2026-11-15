# Decisions log

Deviations from `content.md` and open questions. Add a line whenever you change course.

## Changes made while building Steps 0 and 1

1. **Menu fields added.** `items.calories`, `item_variants.calories`, `item_variants.is_veg`, `categories.tagline`.
   The cafe's printed menu shows calories and taglines, so the schema carries them.
2. **Stricter order security than content.md 7.2.** Staff can only READ orders, payments, refunds and events.
   Every write goes through server code using the service role after an explicit role check.
   Reason: a compromised kitchen login should not be able to edit payments or jump order states.
3. **Availability toggle via function.** Kitchen/captain cannot update `items` directly. They call
   `set_item_availability(item_id, bool)`, which can only touch `is_available` on their own restaurant.
4. **Extra tables/columns:** `payment_accounts` (per-cafe gateway keys, encrypted by the app, service role only),
   `order_counters` + `next_order_number()` (race-safe per-day numbers), `orders.business_date`,
   `orders.access_token` (unguessable guest status link), `restaurants.logo_url/brand_color`.
5. **Fonts:** removed `next/font/google` (build-time network dependency). System font stack for now.
6. **Next.js 16 `cacheComponents` is ON** in `next.config.ts` (scaffold default). Pages that read runtime data
   (cookies, params, database) must be inside `<Suspense>` or call `await connection()`. Remember this in Step 2.

## Open questions (decide before the step that needs them)

- **Guest live status (Step 4/5):** under RLS the anonymous guest cannot subscribe to `orders`.
  Options: (a) the status page polls a server endpoint every 3 s using `access_token` (simplest, recommended for v1);
  (b) server sends Supabase Realtime *Broadcast* messages on a per-order channel. Start with (a).
- **Payment routing (Step 5):** Section 8.2 option A vs B. Needs answers from the gateway's sales team.
- **Chocolate Waffle price:** menu screenshots show Rs 160 and Rs 180. Seed uses 180. Confirm with the cafe.
- **Beverages:** added from the second upload (Hot and Cold). Calories are not printed for drinks, so they are null.

## Known limitations (Step 2)
- An invalid QR shows the friendly "isn't valid" page but returns HTTP 200, because the menu streams inside Suspense
  (Next 16 cacheComponents). Harmless for guests; revisit if you need a real 404 status.
- The cart lives in memory (lost on refresh). Add sessionStorage persistence in Step 3.
- Demo mode only accepts slug `brew-moon` with tokens `devtoken-brew-01..10`.
