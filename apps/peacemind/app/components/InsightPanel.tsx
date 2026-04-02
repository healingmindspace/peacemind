"use client";

export default function InsightPanel() {
  return (
    <div>
      <h2 className="text-sm font-semibold text-pm-text mb-4">Peacemind Insights</h2>

      {/* Placeholder — will be powered by cross-plugin event bus */}
      <div className="bg-pm-surface rounded-2xl p-6 border border-pm-border text-center">
        <span className="text-3xl block mb-3">💡</span>
        <p className="text-sm text-pm-text-secondary mb-2">
          Cross-app insights will appear here
        </p>
        <p className="text-xs text-pm-text-muted max-w-sm mx-auto">
          As you use more apps, Peacemind will discover patterns across your life —
          connecting mood, health, finances, sleep, and more to help you understand yourself better.
        </p>
      </div>

      {/* Example insight cards (static for now) */}
      <div className="mt-4 space-y-3">
        <div className="bg-pm-surface rounded-xl p-4 border border-pm-border opacity-50">
          <p className="text-xs text-pm-text-secondary">
            <span className="font-medium">🌈 Heal + 🌿 Health</span>
          </p>
          <p className="text-xs text-pm-text-tertiary mt-1">
            &quot;Your mood tends to improve on days you track symptoms early&quot;
          </p>
        </div>
        <div className="bg-pm-surface rounded-xl p-4 border border-pm-border opacity-50">
          <p className="text-xs text-pm-text-secondary">
            <span className="font-medium">🌈 Heal + 💰 Money</span>
          </p>
          <p className="text-xs text-pm-text-tertiary mt-1">
            &quot;Spending increases when stress triggers appear — try a walk first&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
