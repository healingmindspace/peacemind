"use client";

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { getDeviceId } from "@/lib/local-store";
import type { User } from "@supabase/supabase-js";

/** Virtual user for anonymous device-based sessions */
interface AnonymousUser {
  id: string;
  email?: undefined;
  user_metadata: Record<string, string | undefined>;
}

interface AuthContextType {
  /** Real Supabase user or anonymous virtual user */
  user: User | AnonymousUser | null;
  accessToken: string | null;
  loading: boolean;
  /** True when using device-only storage (no account) */
  isAnonymous: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, firstName: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  loading: true,
  isAnonymous: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | AnonymousUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Real authenticated user
        setUser(session.user);
        setAccessToken(session.access_token);
        setIsAnonymous(false);
      } else {
        // No session — create anonymous device user
        const deviceId = getDeviceId();
        setUser({ id: deviceId, user_metadata: {} });
        setAccessToken(null);
        setIsAnonymous(true);
      }
      setLoading(false);
    }).catch(() => {
      // Auth check failed — fall back to anonymous
      const deviceId = getDeviceId();
      setUser({ id: deviceId, user_metadata: {} });
      setAccessToken(null);
      setIsAnonymous(true);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setAccessToken(session.access_token);
        setIsAnonymous(false);
      } else {
        const deviceId = getDeviceId();
        setUser({ id: deviceId, user_metadata: {} });
        setAccessToken(null);
        setIsAnonymous(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signUp = async (email: string, password: string, firstName: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName.trim() } },
    });
    if (error) return { error: error.message };
    return { message: "Check your email to confirm." };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Will trigger onAuthStateChange → sets anonymous user
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, isAnonymous, signInWithGoogle, signInWithEmail, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
