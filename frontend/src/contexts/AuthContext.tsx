import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { post } from '../api/apiClient';

const TOKEN_KEY = 'quickinvoice_token';

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const isAuthenticated = token !== null;

  const login = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget: call the logout endpoint but don't wait for it
    post('/auth/logout').catch(() => {
      // Ignore errors — we clear state regardless
    });
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  // Restore token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setToken(stored);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
