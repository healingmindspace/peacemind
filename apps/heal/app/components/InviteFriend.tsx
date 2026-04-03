"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

export default function InviteFriend() {
  const { user, accessToken, isAnonymous } = useAuth();
  const { lang } = useI18n();
  const [code, setCode] = useState<string | null>(null);
  const [uses, setUses] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || isAnonymous || !accessToken) return;
    loadInviteCode();
  }, [user, isAnonymous, accessToken]);

  const loadInviteCode = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get", accessToken }),
      });
      const data = await res.json();
      if (data.code) {
        setCode(data.code);
        setUses(data.uses || 0);
      }
    } catch {}
    setLoading(false);
  };

  const copyLink = async () => {
    if (!code) return;
    const link = `${window.location.origin}/invite/${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    if (!code) return;
    const link = `${window.location.origin}/invite/${code}`;
    const text = lang === "zh"
      ? "我在用 Peacemind 记录心情和日常，感觉很好。你也试试？"
      : "I've been using Peacemind to track my mood and wellness. You should try it!";

    if (navigator.share) {
      try {
        await navigator.share({ title: "Peacemind", text, url: link });
      } catch {}
    } else {
      copyLink();
    }
  };

  if (isAnonymous || !user) return null;
  if (loading) return null;

  return (
    <div className="max-w-sm md:max-w-lg mx-auto mt-6 px-4">
      <div className="bg-pm-surface rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-pm-text mb-2">
          {lang === "zh" ? "🌱 邀请好友" : "🌱 Invite a Friend"}
        </h3>
        <p className="text-xs text-pm-text-secondary mb-3">
          {lang === "zh"
            ? "你获得 50 种子，好友获得 20 种子作为欢迎礼"
            : "You earn 50 seeds, your friend gets 20 seeds as a welcome gift"}
        </p>

        {uses > 0 && (
          <p className="text-xs text-brand mb-3">
            {lang === "zh"
              ? `已有 ${uses} 位好友加入！`
              : `${uses} friend${uses !== 1 ? "s" : ""} joined!`}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={shareLink}
            className="flex-1 py-2 rounded-full text-xs font-medium bg-brand text-white cursor-pointer hover:bg-brand-hover transition-all"
          >
            {lang === "zh" ? "分享链接" : "Share Link"}
          </button>
          <button
            onClick={copyLink}
            className="px-4 py-2 rounded-full text-xs font-medium bg-pm-surface-active text-pm-text-secondary cursor-pointer hover:bg-pm-surface-hover transition-all"
          >
            {copied
              ? (lang === "zh" ? "已复制 ✓" : "Copied ✓")
              : (lang === "zh" ? "复制" : "Copy")}
          </button>
        </div>
      </div>
    </div>
  );
}
