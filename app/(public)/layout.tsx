import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Andrew Fraser — Media Kit',
  description: 'YouTube channel media kit for Andrew Fraser',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: '#0d1117', color: '#e6edf3' }}>
        {children}
      </body>
    </html>
  );
}
