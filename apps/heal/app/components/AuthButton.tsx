"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

export default function AuthButton() {
  const { user, loading, isAnonymous, signInWithGoogle, signInWithEmail, signUp, signOut } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (isSignUp) {
      const result = await signUp(email, password, name);
      if (result.error) setError(result.error);
      else if (result.message) setMessage(t("auth.checkEmail"));
    } else {
      const result = await signInWithEmail(email, password);
      if (result.error) setError(result.error);
      else { setShowForm(false); setEmail(""); setPassword(""); }
    }
  };

  if (loading) return null;

  if (user && !isAnonymous) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-pm-text-secondary">
          {user.user_metadata?.first_name
            || user.user_metadata?.full_name?.split(" ")[0]
            || user.email}
        </span>
        <button
          onClick={signOut}
          className="px-4 py-1.5 rounded-full text-sm bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover transition-colors cursor-pointer"
        >
          {t("auth.signOut")}
        </button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-5 py-2 rounded-full text-sm font-medium bg-brand text-white hover:bg-brand-hover transition-colors cursor-pointer"
      >
        {t("auth.signIn")}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-white text-pm-text shadow-sm hover:shadow-md transition-all cursor-pointer border border-pm-border"
      >
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        {t("auth.google")}
      </button>
      <div className="flex items-center gap-3 text-pm-text-muted text-xs">
        <span className="w-12 h-px bg-pm-border" />
        {t("auth.or")}
        <span className="w-12 h-px bg-pm-border" />
      </div>
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
      {isSignUp && (
        <input type="text" placeholder={t("auth.firstName")} value={name} onChange={(e) => setName(e.target.value)} required className="px-4 py-2 rounded-full bg-pm-surface-active border border-pm-border text-pm-text text-sm placeholder-pm-placeholder focus:outline-none focus:ring-2 focus:ring-brand-light" />
      )}
      <div className="flex gap-2">
        <input type="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} required className="px-4 py-2 rounded-full bg-pm-surface-active border border-pm-border text-pm-text text-sm placeholder-pm-placeholder focus:outline-none focus:ring-2 focus:ring-brand-light" />
        <input type="password" placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="px-4 py-2 rounded-full bg-pm-surface-active border border-pm-border text-pm-text text-sm placeholder-pm-placeholder focus:outline-none focus:ring-2 focus:ring-brand-light" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="px-5 py-2 rounded-full text-sm font-medium bg-brand text-white hover:bg-brand-hover transition-colors cursor-pointer">{isSignUp ? t("auth.signUp") : t("auth.signInBtn")}</button>
        <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }} className="px-5 py-2 rounded-full text-sm bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover transition-colors cursor-pointer">{isSignUp ? t("auth.haveAccount") : t("auth.newUser")}</button>
        <button type="button" onClick={() => { setShowForm(false); setError(""); setMessage(""); }} className="px-3 py-2 rounded-full text-sm text-pm-text-muted hover:text-pm-text-secondary cursor-pointer">{t("auth.cancel")}</button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {message && <p className="text-green-600 text-sm">{message}</p>}
    </form>
    </div>
  );
}
