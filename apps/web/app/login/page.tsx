'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('email') || url.searchParams.has('password')) {
      url.searchParams.delete('email');
      url.searchParams.delete('password');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    setBusy(true); setErr('');
    try {
      const { error } = await createClient().auth.signInWithPassword({ email, password });
      if (error) { setErr('Wrong email or password.'); return; }
      router.push('/admin');
    } catch (error) {
      setErr(error instanceof Error ? `Sign-in failed: ${error.message}` : 'Sign-in failed. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  const field = 'w-full rounded-lg border border-zinc-300 px-4 py-3 text-base';
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-8">
      <h1 className="text-2xl font-semibold">Staff sign in</h1>
      <form className="flex flex-col gap-3" method="post" onSubmit={submit}>
        <input className={field} type="email" name="email" autoComplete="username" required placeholder="Email" aria-label="Email" />
        <input className={field} type="password" name="password" autoComplete="current-password" required placeholder="Password" aria-label="Password" />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button type="submit" disabled={busy} className="min-h-12 rounded-lg bg-zinc-900 font-medium text-white disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
