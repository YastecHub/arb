'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#071826]/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
        <Link href={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/'} className="flex min-w-0 items-center gap-3">
          <img src="/brand/ules-arb-white.png" alt="ULES Academic and Research Board" className="h-8 w-auto sm:h-9" />
          <span className="hidden border-l border-white/20 pl-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300 lg:block">
            ResearchHub
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-1.5">
          {loading ? null : user ? (
            <>
              <NotificationBell />
              <div className="ml-1 flex items-center gap-2">
                <span className="hidden max-w-44 truncate text-sm text-slate-300 md:inline">{user.name}</span>
                <button
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/#about" className="hidden rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white md:inline-flex">
                About
              </Link>
              <Link href="/#library" className="hidden rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white sm:inline-flex">
                Research library
              </Link>
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                Log in
              </Link>
              <Link href="/register" className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-[#071826] transition hover:bg-amber-300 sm:px-4">
                Submit research
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
