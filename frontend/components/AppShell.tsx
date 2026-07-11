'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AiChat02Icon,
  BookOpenTextIcon,
  Cancel01Icon,
  DashboardSquare01Icon,
  FileUploadIcon,
  LibraryIcon,
  Logout03Icon,
  Menu01Icon,
  SidebarLeft01Icon,
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
  { href: '/library', label: 'Research library', icon: LibraryIcon },
  { href: '/assistant', label: 'Ask Ada Torque', icon: AiChat02Icon },
];

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Review desk', icon: DashboardSquare01Icon },
  { href: '/admin/published', label: 'Published papers', icon: BookOpenTextIcon },
  { href: '/library', label: 'Research library', icon: LibraryIcon },
  { href: '/assistant', label: 'Ask Ada Torque', icon: AiChat02Icon },
];

export default function AppShell({ children, title, subtitle, actions }: { children: React.ReactNode; title: string; subtitle?: string; actions?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = user?.role === 'admin' ? adminNav : studentNav;

  useEffect(() => {
    const saved = localStorage.getItem('arb_sidebar_collapsed');
    if (saved) setCollapsed(saved === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('arb_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function doLogout() {
    logout();
    router.push('/');
  }

  return (
    <div className="relative left-1/2 -my-8 w-screen -translate-x-1/2 bg-[#f4f1e8]">
      <div className="mx-auto flex min-h-[calc(100vh-8.6rem)] max-w-[92rem]">
        <Sidebar
          nav={nav}
          pathname={pathname}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((value) => !value)}
          onLogout={doLogout}
          user={user}
        />

        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="h-full w-[19rem] max-w-[86vw] bg-[#071826] p-4 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between">
                <Brand compact={false} />
                <button className="rounded-xl border border-white/10 p-2 hover:bg-white/10" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <Icon icon={Cancel01Icon} />
                </button>
              </div>
              <SidebarNav nav={nav} pathname={pathname} collapsed={false} />
              <UserPanel user={user} collapsed={false} onLogout={doLogout} />
            </div>
          </div>
        )}

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mb-5 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open research menu"
                >
                  <Icon icon={Menu01Icon} />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a6a10]">ResearchHub</p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-[#071826] md:text-3xl">{title}</h1>
                  {subtitle && <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {actions}
                <Link href="/assistant" className="btn-outline">
                  <Icon icon={AiChat02Icon} className="h-4 w-4" />
                  Ask Ada
                </Link>
              </div>
            </div>
          </div>

          {children}
        </section>
      </div>
    </div>
  );
}

function Sidebar({ nav, pathname, collapsed, onCollapse, onLogout, user }: { nav: NavItem[]; pathname: string; collapsed: boolean; onCollapse: () => void; onLogout: () => void; user: any }) {
  return (
    <aside className={`sticky top-[4.05rem] hidden h-[calc(100vh-4.05rem)] shrink-0 border-r border-slate-200 bg-[#071826] p-4 text-white shadow-xl shadow-slate-950/10 transition-all duration-300 lg:flex lg:flex-col ${collapsed ? 'w-[5.8rem]' : 'w-[18rem]'}`}>
      <div className="flex items-center justify-between gap-3">
        <Brand compact={collapsed} />
        <button className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/10 hover:text-white" onClick={onCollapse} aria-label="Toggle sidebar">
          <Icon icon={SidebarLeft01Icon} className={`h-5 w-5 transition ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <SidebarNav nav={nav} pathname={pathname} collapsed={collapsed} />
      <UserPanel user={user} collapsed={collapsed} onLogout={onLogout} />
    </aside>
  );
}

function SidebarNav({ nav, pathname, collapsed }: { nav: NavItem[]; pathname: string; collapsed: boolean }) {
  return (
    <nav className="mt-7 space-y-1">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
              active ? 'bg-amber-400 text-[#071826]' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <Icon icon={item.icon} className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ compact }: { compact: boolean }) {
  return (
    <Link href="/dashboard" className={`flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 ${compact ? 'justify-center' : ''}`}>
      <img src="/brand/ules-arb-white.png" alt="ULES Academic and Research Board" className="h-9 w-auto" />
      {!compact && <span className="border-l border-white/15 pl-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Hub</span>}
    </Link>
  );
}

function UserPanel({ user, collapsed, onLogout }: { user: any; collapsed: boolean; onLogout: () => void }) {
  return (
    <div className={`mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 ${collapsed ? 'text-center' : ''}`}>
      <div className={`flex items-start gap-3 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-[#071826]">
          <Icon icon={UserIcon} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.name || 'ResearchHub user'}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        )}
      </div>
      <button
        onClick={onLogout}
        title={collapsed ? 'Log out' : undefined}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 ${collapsed ? 'px-2' : ''}`}
      >
        <Icon icon={Logout03Icon} className="h-4 w-4" />
        {!collapsed && 'Log out'}
      </button>
    </div>
  );
}
