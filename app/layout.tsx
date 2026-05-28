import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Nav } from '@/components/nav';
import { MainContent } from '@/components/main-content';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'XYNQ CRM',
  description: 'Sales pipeline for XYNQ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-bg text-ink antialiased">
        <Nav />
        <MainContent>{children}</MainContent>
      </body>
    </html>
  );
}
