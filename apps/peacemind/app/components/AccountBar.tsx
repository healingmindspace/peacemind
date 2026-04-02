"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function AccountBar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-pm-text-secondary">
          {user.user_metadata?.first_name
            || user.user_metadata?.full_name?.split(" ")[0]
            || user.email}
        </span>
        <button
          onClick={signOut}
          className="px-4 py-2 rounded-full text-sm font-medium bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signIn}
      className="px-4 py-2 rounded-full text-sm font-medium bg-pm-text text-white hover:bg-pm-text-secondary transition-colors cursor-pointer"
    >
      Sign in
    </button>
  );
}
