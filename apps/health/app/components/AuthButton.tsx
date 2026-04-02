"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useI18n } from "@/lib/i18n";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return (
      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/auth/callback" } })}
        className="text-xs px-3 py-1.5 rounded-full bg-[#4a7a4a] text-white cursor-pointer"
      >
        {t("auth.signIn")}
      </button>
    );
  }

  const firstName = user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "";

  return (
    <div className="relative">
      <button onClick={() => setShowMenu(!showMenu)} className="text-xs text-[#3d5a3d] cursor-pointer">
        {firstName}
      </button>
      {showMenu && (
        <div className="absolute right-0 top-8 bg-white/95 backdrop-blur-md rounded-xl p-2 shadow-lg z-50">
          <button
            onClick={() => { supabase.auth.signOut(); setShowMenu(false); }}
            className="text-xs text-red-400 px-3 py-1.5 cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
