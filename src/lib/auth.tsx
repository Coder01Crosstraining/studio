"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '@/lib/types';

// Mock users - in a real app, this would come from your auth provider/database
const mockUsers: { [email: string]: User } = {
  'ceo@vibra.fit': {
    uid: 'ceo-123',
    name: 'Alex CEO',
    email: 'ceo@vibra.fit',
    role: 'CEO',
    siteId: null,
  },
  'leader.ciudadela@vibra.fit': {
    uid: 'leader-ciudadela-456',
    name: 'Maria Leader',
    email: 'leader.ciudadela@vibra.fit',
    role: 'SiteLeader',
    siteId: 'ciudadela',
  },
};

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for a logged-in user session
    try {
      const storedUser = localStorage.getItem('vibra-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('vibra-user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      setTimeout(() => {
        const foundUser = mockUsers[email];
        if (foundUser) {
          setUser(foundUser);
          localStorage.setItem('vibra-user', JSON.stringify(foundUser));
          resolve();
        } else {
          reject(new Error('Usuario no encontrado. Prueba con "ceo@vibra.fit" o "leader.ciudadela@vibra.fit"'));
        }
        setLoading(false);
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vibra-user');
  };

  const value = {
    user,
    role: user?.role || null,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
