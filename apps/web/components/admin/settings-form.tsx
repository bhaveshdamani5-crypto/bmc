'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettings } from '@/app/actions/admin';

type S = { name: string; phone: string; address: string; gstin: string; taxPercent: string; pricesIncludeTax: boolean; acceptingOrders: boolean; brandColor: string };
const inp = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base';

function L({ t, children }: { t: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-sm text-zinc-600">{t}</span>{children}</label>;
}

export function SettingsForm({ initial }: { initial: S }) {
  const router = useRouter(); const [f, setF] = useState(initial); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false);
  const set = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const r = await saveSettings({ ...f, taxPercent: Number(f.taxPercent), gstin: f.gstin });
    setMsg(r.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: r.error }); setBusy(false); if (r.ok) router.refresh();
  }
  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <L t="Cafe name"><input className={inp} value={f.name} onChange={set('name')} /></L>
      <L t="Phone"><input className={inp} value={f.phone} onChange={set('phone')} /></L>
      <L t="Address"><input className={inp} value={f.address} onChange={set('address')} /></L>
      <L t="GSTIN (optional)"><input className={inp} value={f.gstin} onChange={set('gstin')} /></L>
      <L t="Tax rate (%). Confirm the right rate with your accountant."><input className={inp} inputMode="decimal" value={f.taxPercent} onChange={set('taxPercent')} /></L>
      <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={f.pricesIncludeTax} onChange={set('pricesIncludeTax')} /><span>Menu prices already include tax</span></label>
      <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={f.acceptingOrders} onChange={set('acceptingOrders')} /><span>Accepting QR orders (turn off to pause ordering)</span></label>
      <L t="Brand color"><div className="flex gap-2"><input type="color" aria-label="Pick color" className="h-11 w-14" value={f.brandColor} onChange={set('brandColor')} /><input className={inp} value={f.brandColor} onChange={set('brandColor')} /></div></L>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-green-700' : 'text-red-700'}>{msg.text}</p>}
      <button disabled={busy} className="min-h-12 rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save settings'}</button>
    </form>
  );
}
