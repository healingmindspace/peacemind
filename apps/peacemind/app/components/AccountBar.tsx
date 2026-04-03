"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function AccountBar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then((res) => {
      setUser(res.data.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setShowForm(false);
      setEmail("");
      setPassword("");
    }
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

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 rounded-full text-sm font-medium bg-pm-text text-white hover:bg-pm-text-secondary transition-colors cursor-pointer"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-pm-text shadow-sm hover:shadow-md transition-all cursor-pointer border border-pm-border"
      >
        <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Google
      </button>
      <div className="flex items-center gap-2 text-pm-text-muted text-xs">
        <span className="w-8 h-px bg-pm-border" />
        or
        <span className="w-8 h-px bg-pm-border" />
      </div>
      <form onSubmit={signInWithEmail} className="flex items-center gap-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="px-3 py-1.5 rounded-full bg-pm-surface-active border border-pm-border text-pm-text text-sm placeholder-pm-text-muted focus:outline-none focus:ring-2 focus:ring-pm-border w-36"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="px-3 py-1.5 rounded-full bg-pm-surface-active border border-pm-border text-pm-text text-sm placeholder-pm-text-muted focus:outline-none focus:ring-2 focus:ring-pm-border w-28"
        />
        <button
          type="submit"
          className="px-4 py-1.5 rounded-full text-sm font-medium bg-pm-text text-white cursor-pointer"
        >
          Go
        </button>
        <button
          type="button"
          onClick={() => { setShowForm(false); setError(""); }}
          className="text-xs text-pm-text-muted hover:text-pm-text-secondary cursor-pointer"
        >
          ×
        </button>
      </form>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
