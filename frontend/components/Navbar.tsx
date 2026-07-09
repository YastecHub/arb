'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            AR
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-800">
            ARB <span className="text-brand-600">ResearchHub</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          <Link href="/" className="btn-ghost hidden sm:inline-flex">
            Library
          </Link>
          {loading ? null : user ? (
            <>
              {user.role === 'admin' ? (
                <Link href="/admin" className="btn-ghost">
                  Admin
                </Link>
              ) : (
                <Link href="/dashboard" className="btn-ghost">
                  My Submissions
                </Link>
              )}
              <NotificationBell />
              <div className="ml-1 flex items-center gap-2">
                <span className="hidden text-sm text-slate-500 md:inline">{user.name}</span>
                <button
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  className="btn-outline"
                >
                  Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
