"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export default function CrisisResources({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const resources = (
    <div className="space-y-3 text-sm text-pm-text-secondary">
      {/* US */}
      <div>
        <p className="text-[10px] font-semibold text-pm-text-muted uppercase tracking-wide mb-1">{t("crisis.us")}</p>
        <p>
          <strong>{t("crisis.988")}</strong> — {t("crisis.988action")}{" "}
          <a href="tel:988" className="underline font-semibold">988</a>
        </p>
        <p>
          <strong>{t("crisis.textLine")}</strong> — {t("crisis.textAction")}{" "}
          <a href="sms:741741" className="underline font-semibold">741741</a>
        </p>
      </div>
      {/* China */}
      <div>
        <p className="text-[10px] font-semibold text-pm-text-muted uppercase tracking-wide mb-1">{t("crisis.china")}</p>
        <p>
          <strong>{t("crisis.chinaLine")}</strong> — {t("crisis.chinaAction")}{" "}
          <a href="tel:400-161-9995" className="underline font-semibold">400-161-9995</a>
        </p>
      </div>
      {/* International */}
      <div>
        <p className="text-[10px] font-semibold text-pm-text-muted uppercase tracking-wide mb-1">{t("crisis.intl")}</p>
        <p>
          <strong>{t("crisis.intlLine")}</strong> —{" "}
          <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">findahelpline.com</a>
        </p>
        <p className="text-xs text-pm-text-tertiary">{t("crisis.intlAction")}</p>
      </div>
      <p className="text-xs text-pm-text-tertiary">{t("crisis.available")}</p>
    </div>
  );

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-pm-text-muted hover:text-brand transition-colors cursor-pointer"
        >
          {t("crisis.needHelp")}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-8 md:top-auto md:bottom-8 left-0 z-50 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg w-72 text-left">
              <p className="text-sm font-semibold text-pm-text mb-2">{t("crisis.title")}</p>
              {resources}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <section className="py-8 px-4 text-center">
      <div className="max-w-sm mx-auto bg-pm-surface backdrop-blur-sm rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-pm-text mb-3">{t("crisis.fullTitle")}</h2>
        {resources}
      </div>
    </section>
  );
}
