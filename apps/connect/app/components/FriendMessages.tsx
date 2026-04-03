"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";

const PRESET_MESSAGES = [
  { emoji: "🌱", text: "Rooting for you" },
  { emoji: "☀️", text: "Hope today is a good day" },
  { emoji: "💪", text: "You're showing up and that matters" },
  { emoji: "🌈", text: "Sending good vibes" },
  { emoji: "🤗", text: "You're not alone" },
  { emoji: "🌸", text: "Be gentle with yourself today" },
  { emoji: "⭐", text: "Proud of you" },
  { emoji: "🍃", text: "Take a deep breath — you've got this" },
];

interface FriendMessagesProps {
  user: User | null;
}

export default function FriendMessages({ user }: FriendMessagesProps) {
  const [sent, setSent] = useState<string | null>(null);

  const sendMessage = (text: string) => {
    // TODO: save to DB, send to all friends
    setSent(text);
    setTimeout(() => setSent(null), 3000);
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-3">🌱</p>
        <p className="text-sm text-pm-text-secondary mb-2">Sign in to connect with friends</p>
        <p className="text-xs text-pm-text-muted">Invite friends from the Heal app and send anonymous encouragements</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-pm-text mb-2">Send Encouragement</h2>
      <p className="text-xs text-pm-text-tertiary mb-4">
        Tap a message to send to your friends. They&apos;ll see it from &quot;a friend&quot; — no names, just warmth.
      </p>

      {/* Received messages */}
      <div className="bg-pm-accent-light rounded-2xl p-4 mb-6">
        <p className="text-xs text-pm-text-muted mb-2">Recent from friends:</p>
        <div className="space-y-2">
          {/* Placeholder — will be real messages from DB */}
          <div className="bg-pm-surface rounded-xl p-3">
            <p className="text-sm text-pm-text">
              <span className="mr-1">🌱</span> A friend says: <em className="text-pm-text-secondary">Rooting for you</em>
            </p>
            <p className="text-xs text-pm-text-muted mt-1">Today</p>
          </div>
        </div>
      </div>

      {/* Send */}
      <h3 className="text-xs font-semibold text-pm-text mb-3">Tap to send:</h3>
      <div className="grid grid-cols-2 gap-2">
        {PRESET_MESSAGES.map((msg) => (
          <button
            key={msg.text}
            onClick={() => sendMessage(msg.text)}
            className={`bg-pm-surface hover:bg-pm-surface-hover rounded-xl p-3 text-left transition-all cursor-pointer border border-pm-border ${
              sent === msg.text ? "ring-2 ring-brand" : ""
            }`}
          >
            <span className="text-lg block mb-1">{msg.emoji}</span>
            <p className="text-xs text-pm-text-secondary">{msg.text}</p>
          </button>
        ))}
      </div>

      {sent && (
        <div className="mt-4 text-center">
          <p className="text-xs text-brand font-medium">Sent to your friends ✓</p>
        </div>
      )}

      {/* Invite */}
      <div className="mt-8 bg-pm-surface rounded-2xl p-4 text-center border border-pm-border">
        <p className="text-sm text-pm-text-secondary mb-2">No friends yet?</p>
        <a
          href="https://heal.peacemind.app"
          className="text-xs text-brand font-medium hover:underline"
        >
          Invite friends from the Heal app →
        </a>
      </div>
    </div>
  );
}
