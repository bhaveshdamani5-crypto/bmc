'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveItem, setItemAvailable, deleteItem, saveCategory, hideCategory } from '@/app/actions/admin';
import { formatRupees } from '@/lib/money';

type Cat = { id: string; name: string; tagline: string | null };
type Item = { id: string; category_id: string; name: string; description: string | null; base_price_paise: number; calories: number | null; is_veg: boolean | null; is_available: boolean };
const inp = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base';
const btn = 'min-h-11 rounded-lg px-4 text-sm font-medium';

export function MenuEditor({ categories, items, optionCount }: { categories: Cat[]; items: Item[]; optionCount: Record<string, number> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);   // item id, or "new:<categoryId>"
  const [err, setErr] = useState(''); const [secName, setSecName] = useState('');
  async function run(p: Promise<{ ok: boolean; error?: string }>) { const r = await p; setErr(r.ok ? '' : r.error ?? 'Something went wrong.'); if (r.ok) { setEditing(null); router.refresh(); } return r.ok; }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Menu</h1></div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{err}</p>}
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run(saveCategory({ name: secName }))) setSecName(''); }}>
        <input className={inp} placeholder="New section name (e.g. Desserts)" aria-label="New section name" value={secName} onChange={(e) => setSecName(e.target.value)} />
        <button className={`${btn} bg-zinc-900 text-white`} disabled={!secName.trim()}>Add section</button>
      </form>
      {categories.map((c) => (
        <section key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-medium">{c.name}</h2>
            <button className="text-sm text-zinc-500 underline" onClick={() => confirm(`Hide the section "${c.name}" from the guest menu?`) && run(hideCategory(c.id))}>Hide section</button></div>
          <ul className="divide-y divide-zinc-100">
            {items.filter((i) => i.category_id === c.id).map((i) => editing === i.id
              ? <li key={i.id} className="py-3"><ItemForm categoryId={c.id} item={i} hasOptions={!!optionCount[i.id]} onCancel={() => setEditing(null)} onSave={(d) => run(saveItem(d))} /></li>
              : (<li key={i.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1"><p className={i.is_available ? 'font-medium' : 'font-medium text-zinc-400 line-through'}>{i.name}</p>
                    <p className="text-sm text-zinc-500">{optionCount[i.id] ? `From ${formatRupees(i.base_price_paise)} · ${optionCount[i.id]} options` : formatRupees(i.base_price_paise)}</p></div>
                  <button className={`${btn} border border-zinc-300`} onClick={() => run(setItemAvailable(i.id, !i.is_available))}>{i.is_available ? 'Sold out' : 'In stock'}</button>
                  <button className={`${btn} border border-zinc-300`} onClick={() => setEditing(i.id)}>Edit</button>
                  <button className={`${btn} text-red-600`} aria-label={`Delete ${i.name}`} onClick={() => confirm(`Delete "${i.name}"? Past orders are not affected.`) && run(deleteItem(i.id))}>Delete</button>
                </li>))}
          </ul>
          {editing === `new:${c.id}` ? <div className="mt-3 border-t border-zinc-100 pt-3"><ItemForm categoryId={c.id} onCancel={() => setEditing(null)} onSave={(d) => run(saveItem(d))} /></div>
            : <button className={`${btn} mt-2 border border-dashed border-zinc-300`} onClick={() => setEditing(`new:${c.id}`)}>+ Add item</button>}
        </section>))}
    </div>
  );
}

function ItemForm({ categoryId, item, hasOptions, onSave, onCancel }: { categoryId: string; item?: Item; hasOptions?: boolean; onSave: (d: unknown) => Promise<boolean>; onCancel: () => void }) {
  const [f, setF] = useState({ name: item?.name ?? '', description: item?.description ?? '', price: item ? String(item.base_price_paise / 100) : '',
    isVeg: item?.is_veg == null ? 'none' : item.is_veg ? 'veg' : 'nonveg', calories: item?.calories?.toString() ?? '' });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSave({ ...f, id: item?.id, categoryId }); setBusy(false); }}>
      <input className={inp} placeholder="Item name" aria-label="Item name" value={f.name} onChange={set('name')} />
      <textarea className={inp} placeholder="Description (optional)" aria-label="Description" rows={2} value={f.description} onChange={set('description')} />
      <div className="grid grid-cols-3 gap-2">
        <input className={inp} inputMode="decimal" placeholder="Price ₹" aria-label="Price in rupees" value={f.price} onChange={set('price')} />
        <select className={inp} aria-label="Veg or non-veg" value={f.isVeg} onChange={set('isVeg')}><option value="veg">Veg</option><option value="nonveg">Non-veg</option><option value="none">Not shown</option></select>
        <input className={inp} inputMode="numeric" placeholder="Calories" aria-label="Calories" value={f.calories} onChange={set('calories')} />
      </div>
      {hasOptions && <p className="text-sm text-zinc-500">This item has size/type options. Price here is the starting price; editing the options themselves is not available yet.</p>}
      <div className="flex gap-2"><button disabled={busy || !f.name.trim()} className={`${btn} bg-zinc-900 text-white disabled:opacity-50`}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onCancel} className={`${btn} border border-zinc-300`}>Cancel</button></div>
    </form>
  );
}
