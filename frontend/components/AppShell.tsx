'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AiChat02Icon,
  BookOpenTextIcon,
  DashboardSquare01Icon,
  FileUploadIcon,
  Home05Icon,
  LibraryIcon,
  Logout03Icon,
  Settings02Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth';
import { Icon } from './icons';

interface NavItem {
  href: string;
  label: string;
  icon: any;
}

const studentNav: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: DashboardSquare01Icon },
  { href: '/submit', label: 'Submit research', icon: FileUploadIcon },
  { href: '/#library', label: 'Research library', icon: LibraryIcon },
  { href: '/assistant', label: 'Ask Ada Torque', icon: AiChat02Icon },
];

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Review desk', icon: DashboardSquare01Icon },
  { href: '/admin/published', label: 'Published papers', icon: BookOpenTextIcon },
  { href: '/#library', label: 'Research library', icon: LibraryIcon },
  { href: '/assistant', label: 'Ask Ada Torque', icon: AiChat02Icon },
];

export default function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const nav = user?.role === 'admin' ? adminNav : studentNav;

  return (
    <div className="relative left-1/2 -my-8 w-screen -translate-x-1/2 bg-[#f4f1e8]">
      <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-[#071826] p-4 text-white shadow-xl shadow-slate-900/10 lg:flex">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5">
            <img src="/brand/ules-arb-white.png" alt="ULES Academic and Research Board" className="h-9 w-auto" />
            <span className="border-l border-white/15 pl-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              Hub
            </span>
          </Link>

          <nav className="mt-7 space-y-1">
            {nav.map((item) => {
              const active = item.href !== '/#library' && (pathname === item.href || pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active ? 'bg-amber-400 text-[#071826]' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon icon={item.icon} className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-[#071826]">
                <Icon icon={UserIcon} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user?.name || 'ResearchHub user'}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Icon icon={Logout03Icon} className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#9a6a10]">
                <Icon icon={Home05Icon} className="h-4 w-4" />
                ResearchHub Workspace
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#071826]">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            <Link href="/assistant" className="btn-outline">
              <Icon icon={AiChat02Icon} className="h-4 w-4" />
              Ask Ada
            </Link>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 lg:hidden">
            {nav.slice(0, 4).map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <Icon icon={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>

          {children}
        </section>
      </div>
    </div>
  );
}
