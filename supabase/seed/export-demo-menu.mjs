// node supabase/seed/export-demo-menu.mjs  -> apps/web/lib/menu/demo-menu.json (lets the app run with no database)
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { categories } from './menu.mjs';
const uuid = (k) => { const h = createHash('md5').update(k).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const paise = (r) => Math.round(r * 100);
const out = categories.map((cat) => ({
  id: uuid(`cat:${cat.name}`), name: cat.name, tagline: cat.tagline ?? null,
  items: cat.items.map((it) => {
    const id = uuid(`item:${cat.name}:${it.n}`);
    const base = it.vars ? Math.min(...it.vars.map((x) => x.p)) : it.p;
    return {
      id, name: it.n, description: it.d ?? null, basePricePaise: paise(base), calories: it.vars ? null : (it.c ?? null),
      isVeg: it.vars ? (it.vars.every((x) => x.v === true) ? true : it.vars.every((x) => x.v === false) ? false : null) : (it.v ?? null),
      isAvailable: true,
      variants: (it.vars ?? []).map((x) => ({ id: uuid(`var:${id}:${x.n}`), name: x.n, deltaPaise: paise(x.p - base), calories: x.c ?? null, isVeg: x.v ?? null })),
      groups: (it.mods ?? []).map((g) => { const gid = uuid(`grp:${id}:${g.g}`);
        return { id: gid, name: g.g, min: g.min, max: g.max, options: g.o.map(([n, e]) => ({ id: uuid(`mod:${gid}:${n}`), name: n, deltaPaise: paise(e) })) }; }),
    };
  }),
}));
writeFileSync('apps/web/lib/menu/demo-menu.json', JSON.stringify(out));
console.log('demo-menu.json:', out.reduce((n, c) => n + c.items.length, 0), 'items');
