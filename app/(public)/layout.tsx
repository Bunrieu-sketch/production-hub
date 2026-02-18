import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Media Kit Preview',
  description: 'Shareable media kit preview',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ overflow: 'auto', height: 'auto', background: '#0d1117' }}>
        {children}
      </body>
    </html>
  );
}
