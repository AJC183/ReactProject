import { Stack, useRouter, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { seedIfEmpty } from '@/db/seed';

export type User = {
  id: number;
  username: string;
  email: string;
  createdAt: string;
};

type AuthContextType = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthContext');
  return ctx;
}

// Rendered after <Stack> so the navigator is guaranteed to be mounted
// before any navigation attempt. setTimeout(0) defers to the next event
// loop tick to satisfy expo-router's own readiness check.
function AuthGuard() {
  const { user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const id = setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)';
      if (!user && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (user && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }, 0);
    return () => clearTimeout(id);
  }, [user, segments]);

  return null;
}

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    void seedIfEmpty();
  }, []);

  const login = (u: User) => setUser(u);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Stack screenOptions={{ headerShown: false }} />
      <AuthGuard />
    </AuthContext.Provider>
  );
}
