'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addTable, setTableActive, regenerateTableToken } from '@/app/actions/admin';

type Row = { id: string; label: string; active: boolean; url: string; svg: string };
const btn = 'min-h-11 rounded-lg border border-zinc-300 px-3 text-sm';

export function TablesManager({ cafeName, rows }: { cafeName: string; rows: Row[] }) {
  const router = useRouter(); const [label, setLabel] = useState(''); const [err, setErr] = useState('');
  async function run(p: Promise<{ ok: boolean; error?: string }>) { const r = await p; setErr(r.ok ? '' : r.error ?? 'Something went wrong.'); if (r.ok) router.refresh(); return r.ok; }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden"><h1 className="text-2xl font-semibold">Tables & QR codes</h1>
        <button className={btn} onClick={() => window.print()}>Print all QR codes</button></div>
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700 print:hidden">{err}</p>}
      <form className="flex gap-2 print:hidden" onSubmit={async (e) => { e.preventDefault(); if (await run(addTable(label))) setLabel(''); }}>
        <input className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-base" placeholder="New table name (e.g. T11)" aria-label="New table name" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="min-h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white" disabled={!label.trim()}>Add table</button>
      </form>
      <ul className="grid gap-4 sm:grid-cols-2 print:grid-cols-3">
        {rows.filter((r) => r.active).map((r) => (
          <li key={r.id} className="break-inside-avoid rounded-xl border border-zinc-200 bg-white p-4 text-center">
            <p className="text-sm text-zinc-500">{cafeName}</p><p className="text-2xl font-semibold">Table {r.label}</p>
            <div className="mx-auto my-2 w-44" dangerouslySetInnerHTML={{ __html: r.svg }} />
            <p className="text-sm">Scan to order and pay</p>
            <div className="mt-3 flex justify-center gap-2 print:hidden">
              <button className={btn} onClick={() => confirm(`Replace the QR code for ${r.label}? The printed one will stop working.`) && run(regenerateTableToken(r.id))}>New code</button>
              <button className={btn} onClick={() => confirm(`Turn off table ${r.label}?`) && run(setTableActive(r.id, false))}>Turn off</button></div>
          </li>))}
      </ul>
      {rows.some((r) => !r.active) && <section className="print:hidden"><h2 className="mb-2 font-medium">Turned off</h2><ul className="space-y-2">
        {rows.filter((r) => !r.active).map((r) => <li key={r.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3"><span>{r.label}</span><button className={btn} onClick={() => run(setTableActive(r.id, true))}>Turn on</button></li>)}</ul></section>}
    </div>
  );
}
