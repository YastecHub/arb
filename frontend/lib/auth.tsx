'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, tokenStore } from './api';
import type { User } from './types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    if (!tokenStore.access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>('/api/auth/me', { auth: true });
      setUser(me);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function login(email: string, password: string) {
    const res = await api<{ user: User; accessToken: string; refreshToken: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    tokenStore.set(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refreshUser: loadMe }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
