export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-2 p-8">
      <h1 className="text-xl font-semibold">This QR code isn’t valid</h1>
      <p className="text-zinc-600">Ask a member of staff to help you, or scan the code on your table again.</p>
    </main>
  );
}
