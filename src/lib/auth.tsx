"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User, UserRole } from '@/lib/types';
import { FullPageLoader } from '@/components/loader';
import { FirebaseError } from 'firebase/app';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserContext: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, get custom user data from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const customData = userDoc.data();

          if (customData.status === 'inactive') {
            // If an active session exists for a user that was just disabled, log them out.
            await signOut(auth);
            setUser(null);
          } else {
             setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              name: customData.name,
              role: customData.role,
              siteId: customData.siteId,
              photoURL: customData.photoURL,
              documentId: customData.documentId,
              status: customData.status || 'active',
            });
          }
        } else {
          // This can happen if the user is deleted from Firestore but not Auth.
          console.error("User data not found in Firestore. Signing out.");
          await signOut(auth);
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data().status === 'inactive') {
      await signOut(auth);
      throw new FirebaseError('auth/user-disabled', 'This user account has been disabled.');
    }
    // If user is active, onAuthStateChanged will handle setting the user state.
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };
  
  const updateUserContext = (data: Partial<User>) => {
    setUser(currentUser => (currentUser ? { ...currentUser, ...data } : null));
  };


  const value = {
    user,
    role: user?.role || null,
    loading,
    login,
    logout,
    updateUserContext,
  };

  return <AuthContext.Provider value={value}>{loading ? <FullPageLoader /> : children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
