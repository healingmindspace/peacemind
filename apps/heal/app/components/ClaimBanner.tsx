"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { hasLocalData, exportAllLocalData, clearAllLocalData, clearDeviceId } from "@/lib/local-store";

export default function ClaimBanner() {
  const { isAnonymous, user, accessToken, signInWithGoogle } = useAuth();
  const { lang } = useI18n();
  const [localDataCount, setLocalDataCount] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Count local data entries
  useEffect(() => {
    if (isAnonymous) {
      exportAllLocalData().then((data) => {
        const total = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
        setLocalDataCount(total);
      });
    }
  }, [isAnonymous]);

  // When user signs in (transitions from anonymous → authenticated), migrate data
  useEffect(() => {
    if (!isAnonymous && accessToken) {
      hasLocalData().then((has) => {
        if (has) migrateData();
      });
    }
  }, [isAnonymous, accessToken]);

  const migrateData = async () => {
    if (!accessToken) return;
    setMigrating(true);

    try {
      const localData = await exportAllLocalData();
      const totalRows = Object.values(localData).reduce((sum, rows) => sum + rows.length, 0);
      if (totalRows === 0) return;

      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: localData, accessToken }),
      });

      if (res.ok) {
        await clearAllLocalData();
        clearDeviceId();
        setLocalDataCount(0);
      }
    } catch {
      // Migration failed — data is still safe locally
    } finally {
      setMigrating(false);
    }
  };

  // Don't show if authenticated or dismissed or no data yet
  if (!isAnonymous || dismissed) return null;

  // Show migration progress
  if (migrating) {
    return (
      <div className="mx-4 mt-3 px-4 py-3 rounded-2xl bg-pm-accent-light/70 text-center">
        <p className="text-xs text-pm-text-secondary">
          {lang === "zh" ? "正在同步你的数据..." : "Syncing your data..."}
        </p>
      </div>
    );
  }

  // Gentle banner — only show after user has some data
  if (localDataCount === 0) return null;

  return (
    <div className="mx-4 mt-3 px-4 py-3 rounded-2xl bg-pm-accent-light/70">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-pm-text-secondary leading-relaxed">
            {lang === "zh"
              ? `你有 ${localDataCount} 条记录保存在这台设备上。创建账号即可安全保存，随时随地访问。`
              : `You have ${localDataCount} ${localDataCount === 1 ? "entry" : "entries"} saved on this device. Sign in to keep them safe and access from anywhere.`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={signInWithGoogle}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-brand text-white cursor-pointer"
          >
            {lang === "zh" ? "保存" : "Save"}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-pm-text-muted hover:text-pm-text-secondary cursor-pointer text-xs"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
