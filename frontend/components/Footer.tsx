'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const APP_PREFIXES = ['/dashboard', '/admin', '/submit', '/submissions', '/assistant', '/library'];

export default function Footer() {
  const { user } = useAuth();
  const pathname = usePathname();
  const inApp = Boolean(user) && APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (inApp) return null;

  return (
    <footer className="border-t border-white/10 bg-[#071826] py-8 text-center text-sm text-slate-400">
      <p className="font-medium text-slate-200">ULES Academic &amp; Research Board</p>
      <p className="mt-1">University of Lagos Engineering Society · ResearchHub</p>
    </footer>
  );
}
