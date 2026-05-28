import './globals.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Nav } from '@/components/nav';

export const metadata: Metadata = {
  title: 'XYNQ CRM',
  description: 'Sales pipeline for XYNQ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get('x-pathname') ?? '';
  const hideNav = pathname.startsWith('/login') || pathname.startsWith('/share');

  return (
    <html lang="en">
      <body className="bg-bg text-ink antialiased">
        {!hideNav && <Nav />}
        {children}
      </body>
    </html>
  );
}
