'use client';

import { usePathname } from 'next/navigation';

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasSidebar = !pathname.startsWith('/login') && !pathname.startsWith('/share');
  return <div className={hasSidebar ? 'ml-56 min-h-screen' : ''}>{children}</div>;
}
