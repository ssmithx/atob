import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { NostrProvider } from '@/components/nostr-provider';
import { Footer } from '@/components/ui/footer';
import { Navbar } from '@/components/navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'A to ₿ - Decentralized Package Delivery',
  description: 'A decentralized package delivery platform built on Nostr technology',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }],
    shortcut: '/icon-512.png',
    apple: '/icon-512.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/icon-512.png',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <NostrProvider>
          <Navbar />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <Footer />
          <Toaster />
        </NostrProvider>
      </body>
    </html>
  );
}
