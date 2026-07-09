import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'ARB ResearchHub — UNILAG Faculty of Engineering',
  description:
    'Search and read approved engineering research from the University of Lagos. Keyword and AI-powered semantic search.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-400">
            ARB ResearchHub · University of Lagos, Faculty of Engineering
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
