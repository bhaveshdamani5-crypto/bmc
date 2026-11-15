import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">TableTap</h1>
      <p className="text-zinc-600">QR table ordering for cafes. The guest menu and cart are live in demo mode.</p>
      <Link className="underline" href="/brew-moon/t/devtoken-brew-01">Open the demo menu for table T1</Link>
      <p className="text-sm text-zinc-500">Uptime check: <code>/api/health</code></p>
    </main>
  );
}
