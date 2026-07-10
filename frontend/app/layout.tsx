import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'ULES ARB ResearchHub — Engineering Knowledge, Openly Shared',
  description:
    'Search and read approved engineering research from the University of Lagos. Keyword and AI-powered semantic search.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-white/10 bg-[#071826] py-8 text-center text-sm text-slate-400">
            <p className="font-medium text-slate-200">ULES Academic &amp; Research Board</p>
            <p className="mt-1">University of Lagos Engineering Society · ResearchHub</p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
