'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getMe,
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
} from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await getMe();
      const nextUser = data && data.user ? data.user : null;
      if (!mounted.current) return nextUser;
      setUser(nextUser);
      setStatus(nextUser ? 'authenticated' : 'anonymous');
      return nextUser;
    } catch (err) {
      // 401 / network failures both degrade quietly to an anonymous session.
      if (!mounted.current) return null;
      setUser(null);
      setStatus('anonymous');
      return null;
    }
  }, []);

  useEffect(() => {
    // Runtime only — this never runs during the Next.js build.
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin({ email, password });
    const nextUser = data && data.user ? data.user : null;
    if (mounted.current) {
      setUser(nextUser);
      setStatus(nextUser ? 'authenticated' : 'anonymous');
    }
    return nextUser;
  }, []);

  const signup = useCallback(async ({ fullName, email, password }) => {
    const data = await apiSignup({ fullName, email, password });
    const nextUser = data && data.user ? data.user : null;
    if (mounted.current) {
      setUser(nextUser);
      setStatus(nextUser ? 'authenticated' : 'anonymous');
    }
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      // Even if the call fails we drop the local session state.
    }
    if (mounted.current) {
      setUser(null);
      setStatus('anonymous');
    }
    return true;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && Boolean(user),
      login,
      signup,
      logout,
      refresh,
    }),
    [user, status, login, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}

export default AuthContext;