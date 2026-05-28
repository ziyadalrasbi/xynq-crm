import { signIn } from './actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-500">
            XYNQ
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your workspace</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-card-lg">
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="next" value={searchParams.next ?? '/'} />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Email address
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@xynq.io"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition"
              />
            </div>

            {searchParams.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {searchParams.error}
              </p>
            )}

            <button
              type="submit"
              className="mt-1 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.99]"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          First time? Create your user in Supabase → Authentication → Users.
        </p>
      </div>
    </main>
  );
}
