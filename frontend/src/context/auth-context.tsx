import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { api, clearApiCache, configureApiClient } from '../lib/api-client';
import { authStorage } from '../lib/storage';
import type { AuthSession, AuthUser } from '../types/api';

interface AuthContextValue {
  isHydrated: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { fullName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const sessionRef = useRef<AuthSession | null>(null);

  const logout = useCallback(() => {
    clearApiCache();
    sessionRef.current = null;
    setSession(null);
    authStorage.clear();
  }, []);

  useEffect(() => {
    const storedSession = authStorage.load();
    if (storedSession) {
      sessionRef.current = storedSession;
      setSession(storedSession);
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    configureApiClient({
      getToken: () => sessionRef.current?.accessToken ?? null,
      onUnauthorized: logout,
    });
  }, [logout]);

  const persistSession = (nextSession: AuthSession) => {
    clearApiCache();
    sessionRef.current = nextSession;
    setSession(nextSession);
    authStorage.save(nextSession);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      isAuthenticated: Boolean(session?.accessToken),
      user: session?.user ?? null,
      token: session?.accessToken ?? null,
      async login(payload) {
        const result = await api.auth.login(payload);
        persistSession(result);
      },
      async register(payload) {
        const result = await api.auth.register(payload);
        persistSession(result);
      },
      logout,
      setUser(user) {
        if (!session) {
          return;
        }

        const nextSession = {
          ...session,
          user,
        };

        persistSession(nextSession);
      },
    }),
    [isHydrated, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
