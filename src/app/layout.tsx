import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SpeedInsights } from "@vercel/speed-insights/next";

import { PremiumEffects } from '@/components/PremiumEffects';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RupeeLedger Pro - Private Personal Finance',
  description: 'Secure, local-first financial ledger with AI-powered narrations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} font-body antialiased`}>
        <PremiumEffects />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
