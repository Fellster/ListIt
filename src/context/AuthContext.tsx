import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  signInAnonymously,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInAsDemoUser: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AVATAR_COLORS = [
  'bg-emerald-500 text-white',
  'bg-indigo-500 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-violet-500 text-white',
  'bg-sky-500 text-white',
  'bg-teal-500 text-white',
  'bg-pink-500 text-white'
];

export function getAvatarColor(identifier: string): string {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function getInitials(nameOrEmail?: string): string {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nameOrEmail.slice(0, 2).toUpperCase();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync profile document with Firestore
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);
      const email = firebaseUser.email || `${firebaseUser.uid.slice(0, 6)}@listit.app`;
      const displayName = firebaseUser.displayName || email.split('@')[0] || 'ListIt User';

      const profileData: UserProfile = {
        uid: firebaseUser.uid,
        email: email.toLowerCase(),
        displayName,
        photoURL: firebaseUser.photoURL || undefined
      };

      if (!snap.exists()) {
        await setDoc(userRef, {
          ...profileData,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }

      setUserProfile(profileData);
    } catch (e) {
      console.warn('Sync profile error:', e);
      // Fallback local profile
      setUserProfile({
        uid: firebaseUser.uid,
        email: (firebaseUser.email || `${firebaseUser.uid.slice(0, 6)}@listit.app`).toLowerCase(),
        displayName: firebaseUser.displayName || 'ListIt User',
        photoURL: firebaseUser.photoURL || undefined
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
        const saved = localStorage.getItem('listit_active_profile');
        if (saved) {
          try {
            setUserProfile(JSON.parse(saved));
          } catch (e) {
            setUserProfile({
              uid: 'user_keithfell1_gmail_com',
              email: 'keithfell1@gmail.com',
              displayName: 'Keith Fell'
            });
          }
        } else {
          const defaultProf: UserProfile = {
            uid: 'user_keithfell1_gmail_com',
            email: 'keithfell1@gmail.com',
            displayName: 'Keith Fell'
          };
          localStorage.setItem('listit_active_profile', JSON.stringify(defaultProf));
          setUserProfile(defaultProf);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(res);
      if (credential?.accessToken) {
        localStorage.setItem('listit_gcal_token', credential.accessToken);
        window.dispatchEvent(new Event('storage'));
      }
      if (res.user) {
        await syncUserProfile(res.user);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.toLowerCase().includes('popup-closed-by-user') ||
        err?.message?.toLowerCase().includes('popup window closed')
      ) {
        console.info('Google sign-in popup was closed by user.');
        return;
      }
      console.warn('Google Sign In notice:', err?.message || err);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
      if (res.user) {
        await syncUserProfile(res.user);
      }
    } catch (err: any) {
      console.error('Email Sign In Error:', err);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
      if (res.user) {
        await updateProfile(res.user, { displayName: name });
        await syncUserProfile({ ...res.user, displayName: name } as User);
      }
    } catch (err: any) {
      console.error('Email Sign Up Error:', err);
      throw err;
    }
  };

  // Demo user helper to test real-time sharing between multiple personas easily
  const signInAsDemoUser = async (name: string, email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const localUid = 'user_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const profileData: UserProfile = {
      uid: localUid,
      email: cleanEmail,
      displayName: name
    };

    try {
      // Try anonymous sign in if enabled on backend
      try {
        const res = await signInAnonymously(auth);
        if (res.user) {
          await updateProfile(res.user, { displayName: name });
          const userRef = doc(db, 'users', res.user.uid);
          const fullProfile: UserProfile = {
            uid: res.user.uid,
            email: cleanEmail,
            displayName: name
          };
          await setDoc(userRef, fullProfile, { merge: true });
          setUserProfile(fullProfile);
          localStorage.setItem('listit_active_profile', JSON.stringify(fullProfile));
          return;
        }
      } catch (anonErr: any) {
        // Anonymous auth might be disabled or restricted in Firebase console
        // Gracefully use local active persona
      }

      // Safe local persona fallback
      localStorage.setItem('listit_active_profile', JSON.stringify(profileData));
      setUserProfile(profileData);
    } catch (err: any) {
      console.warn('Demo persona switch notice:', err);
      localStorage.setItem('listit_active_profile', JSON.stringify(profileData));
      setUserProfile(profileData);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    setUser(null);
    localStorage.removeItem('listit_active_profile');
    setUserProfile(null);
  };

  const updateDisplayName = async (name: string) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
      if (userProfile) {
        const updated = { ...userProfile, displayName: name };
        setUserProfile(updated);
        await setDoc(doc(db, 'users', auth.currentUser.uid), { displayName: name }, { merge: true });
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsDemoUser,
        logout,
        updateDisplayName
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
