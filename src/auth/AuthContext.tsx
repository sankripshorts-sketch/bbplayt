import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { bookingFlowApi, loginRequest } from '../api/endpoints';
import { fetchMemberBalanceIcafe } from '../api/icafeMemberBalance';
import type { SessionUser } from '../api/types';
import { extractToken, mapLoginData } from './mapLogin';
import { clearSession, getSession, setSession } from './sessionStorage';

export type PatchUserInput = {
  balanceRub?: number;
  bonusBalanceRub?: number;
  displayName?: string;
  rawPatch?: Record<string, unknown>;
};

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  patchUser: (patch: PatchUserInput) => Promise<void>;
  refreshMemberBalance: () => Promise<void>;
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

  const patchUser = useCallback(async (patch: PatchUserInput) => {
    const session = await getSession();
    if (!session?.user) return;
    const prev = session.user;
    const nextRaw =
      patch.rawPatch && Object.keys(patch.rawPatch).length
        ? { ...prev.raw, ...patch.rawPatch }
        : prev.raw;
    const next: SessionUser = {
      ...prev,
      raw: nextRaw,
      balanceRub: patch.balanceRub ?? prev.balanceRub,
      bonusBalanceRub: patch.bonusBalanceRub ?? prev.bonusBalanceRub,
      displayName: patch.displayName ?? prev.displayName,
    };
    await setSession({ ...session, user: next });
    setUser(next);
  }, []);

  const refreshMemberBalance = useCallback(async () => {
    if (!user?.memberId || !user.memberAccount.trim()) return;
    const { icafe_id } = await bookingFlowApi.icafeIdForMember();
    const cafeId = Number(String(icafe_id).trim());
    const { balanceRub, bonusRub } = await fetchMemberBalanceIcafe({
      cafeId,
      memberId: user.memberId,
      memberAccount: user.memberAccount,
    });
    await patchUser({
      balanceRub,
      ...(bonusRub !== undefined ? { bonusBalanceRub: bonusRub } : {}),
    });
  }, [user, patchUser]);

  const value = useMemo(
    () => ({ user, ready, login, logout, patchUser, refreshMemberBalance }),
    [user, ready, login, logout, patchUser, refreshMemberBalance]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вне AuthProvider');
  return ctx;
}
