import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'AI QA Platform - Enterprise Quality Assurance SaaS',
  description: 'AI-Powered Software Quality Assurance and Test Management SaaS',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased dark:bg-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
