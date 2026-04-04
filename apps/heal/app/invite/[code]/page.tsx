"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"ready" | "accepting" | "success" | "error">("ready");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAccessToken(session?.access_token ?? null);
      setLoading(false);
    });
  }, [supabase]);

  const signIn = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
  };

  const acceptInvite = async () => {
    if (!accessToken) return;
    setStatus("accepting");

    const res = await fetch("/api/friends/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", accessToken, code }),
    });

    if (res.ok) {
      setStatus("success");
      setTimeout(() => router.push("/"), 2000);
    } else {
      const data = await res.json();
      setStatus("error");
      setError(data.error || "Failed to accept invite.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-pm-bg">
        <p className="text-pm-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 bg-pm-bg">
      <h1 className="text-2xl font-bold text-pm-text">Friend Invite</h1>

      {!user && (
        <>
          <p className="text-pm-text-secondary text-center">
            Someone wants to connect with you on Peacemind.
          </p>
          <p className="text-sm text-pm-text-muted">Sign in to accept this invite.</p>
          <button
            onClick={signIn}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-white text-pm-text shadow-sm hover:shadow-md transition-all cursor-pointer border border-pm-border"
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>
        </>
      )}

      {user && status === "ready" && (
        <>
          <p className="text-pm-text-secondary text-center">
            Someone wants to connect with you on Peacemind.
          </p>
          <button
            onClick={acceptInvite}
            className="px-6 py-2 rounded-full bg-brand text-white font-medium hover:bg-brand-hover transition-colors cursor-pointer"
          >
            Accept Invite
          </button>
        </>
      )}

      {status === "accepting" && <p className="text-pm-text-muted">Accepting...</p>}

      {status === "success" && (
        <p className="text-green-600 font-medium">
          You are now connected! Redirecting...
        </p>
      )}

      {status === "error" && <p className="text-red-400">{error}</p>}
    </div>
  );
}
