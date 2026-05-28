// Public layout — no auth, no nav. The root layout will hide the nav for
// /share/* because of the x-pathname check.

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
