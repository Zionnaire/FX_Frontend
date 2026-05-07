'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as authService from '../services/auth.service';
import { setAccessToken } from '../services/api';

interface AuthContextValue {
  user: any;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function restore() {
      try {
        const response = await authService.refreshToken();
        const token = response.data.data.accessToken;
        setToken(token);
        setAccessToken(token);
        const profile = await authService.getProfile();
        setUser(profile.data.data);
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    restore();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    const token = response.data.data.accessToken;
    setToken(token);
    setAccessToken(token);
    setUser(response.data.data.user);
    router.push('/');
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await authService.register(name, email, password);
    const token = response.data.data.accessToken;
    setToken(token);
    setAccessToken(token);
    setUser(response.data.data.user);
    router.push('/');
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setAccessToken(null);
    setUser(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile.data.data);
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, isAuthenticated: !!user, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export const useAuthContext = useAuth;
