import { signIn } from './actions';

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-xl font-semibold tracking-tight">XYNQ CRM</h1>
      <p className="mt-1 text-sm text-muted">Sign in</p>
      <form action={signIn} className="mt-6 space-y-3">
        <input type="hidden" name="next" value={searchParams.next ?? '/'} />
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="email"
          className="w-full rounded border border-border bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="password"
          className="w-full rounded border border-border bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Sign in
        </button>
        {searchParams.error && (
          <p className="text-sm text-overdue">{searchParams.error}</p>
        )}
      </form>
      <p className="mt-6 text-xs text-muted">
        First time? Create your user in Supabase Dashboard → Authentication → Users.
      </p>
    </main>
  );
}
