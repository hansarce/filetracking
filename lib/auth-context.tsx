"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  isAuthenticated: boolean;
  userDivision: string | null;
  login: (uid: string, division: string) => void;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userDivision, setUserDivision] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check localStorage for auth token on initial load
    const uid = localStorage.getItem('authToken');
    const division = localStorage.getItem('userDivision');
    
    if (uid && division) {
      setIsAuthenticated(true);
      setUserDivision(division);
    }
    
    setLoading(false);
  }, []);

  const login = (uid: string, division: string) => {
    localStorage.setItem('authToken', uid);
    localStorage.setItem('userDivision', division);
    setIsAuthenticated(true);
    setUserDivision(division);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userDivision');
    setIsAuthenticated(false);
    setUserDivision(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userDivision, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}