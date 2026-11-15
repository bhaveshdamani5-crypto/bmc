# Owner dashboard

Sign in at `/login` with an **owner** or **manager** account. You land on `/admin`. Kitchen and captain accounts are sent to `/kitchen` instead.

| Page | What it does |
|---|---|
| `/admin` Overview | Today's sales, orders, average order, 7-day chart, top items |
| `/admin/menu` | Add sections, add/edit/delete items, price, veg marker, calories, mark sold out |
| `/admin/tables` | Add or turn off tables, show each table's QR, print all, replace a leaked QR |
| `/admin/settings` | Cafe name, GSTIN, tax rate, tax-inclusive prices, pause ordering, brand color |

## How it stays secure
Every change runs as the logged-in owner through the database's own row-level rules, so one cafe can never touch another's data. Deleting an item only hides it; past orders keep their copied names and prices.

## Not in the dashboard yet
Editing an item's size/type options and add-ons, reordering by drag, staff invites, CSV export, date-range reports, uploading item photos.

## Try it
1. Make an owner: `cd apps/web && node --env-file=.env.local scripts/create-staff.mjs you@example.com 'long-password' owner brew-moon`
2. `npm run dev`, open `/login`, sign in, change a price in Menu, then reload `/brew-moon/t/devtoken-brew-01` to see it.
3. Place a few test orders (see docs/SETUP.md) and watch Overview update.
