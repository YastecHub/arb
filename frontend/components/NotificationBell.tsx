'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Notification } from '@/lib/types';
import { formatDate } from '@/lib/format';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await api<{ items: Notification[]; unread: number }>('/api/notifications', { auth: true });
      setItems(res.items);
      setUnread(res.unread);
    } catch {
      /* not logged in */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await api('/api/notifications/read-all', { method: 'POST', auth: true });
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-full p-2 hover:bg-slate-100" aria-label="Notifications">
        <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || '#'}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-slate-50 px-4 py-3 text-sm hover:bg-slate-50 ${
                    n.is_read ? 'text-slate-500' : 'text-slate-800'
                  }`}
                >
                  <p>{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(n.created_at)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
