import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest } from '../api/endpoints';
import type { SessionUser } from '../api/types';
import { extractToken, mapLoginData } from './mapLogin';
import { clearSession, getSession, setSession } from './sessionStorage';

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getSession();
        if (session?.user && !cancelled) {
          setUser(session.user);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data, setCookie } = await loginRequest({
      username: username.trim(),
      password,
    });
    const merged: Record<string, unknown> =
      data.user && typeof data.user === 'object' && data.user !== null
        ? { ...data, ...(data.user as Record<string, unknown>) }
        : data;
    const mapped = mapLoginData(merged, username.trim());
    const token = extractToken(merged);
    await setSession({
      user: mapped,
      authToken: token,
      cookie: setCookie ?? undefined,
    });
    setUser(mapped);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout }),
    [user, ready, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
