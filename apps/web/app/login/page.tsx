'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setErr('');
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) { setErr('Wrong email or password.'); setBusy(false); } else router.push('/kitchen');
  }
  const field = 'w-full rounded-lg border border-zinc-300 px-4 py-3 text-base';
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-8">
      <h1 className="text-2xl font-semibold">Staff sign in</h1>
      <input className={field} type="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={field} type="password" placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy || !email || !password} onClick={submit} className="min-h-12 rounded-lg bg-zinc-900 font-medium text-white disabled:opacity-50">Sign in</button>
    </main>
  );
}
