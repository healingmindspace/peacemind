"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const ADMIN_EMAIL = "healingmindspace@proton.me";

interface FeedbackItem {
  id: string;
  subject: string | null;
  message: string;
  reply: string | null;
  replied_at: string | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

export default function AdminFeedbackPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState<"all" | "unreplied" | "replied">("all");

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (user?.email === ADMIN_EMAIL) loadFeedback();
    });
  }, []);

  const loadFeedback = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("id, subject, message, reply, replied_at, user_id, user_email, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setFeedbackList(data);
  };

  const sendReply = async (feedbackId: string) => {
    if (!replyText.trim()) return;
    await supabase
      .from("feedback")
      .update({ reply: replyText.trim(), replied_at: new Date().toISOString() })
      .eq("id", feedbackId);
    setReplyingTo(null);
    setReplyText("");
    loadFeedback();
  };

  const deleteFeedback = async (id: string) => {
    await supabase.from("feedback").delete().eq("id", id);
    loadFeedback();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  };

  const filtered = feedbackList.filter((fb) => {
    if (filter === "unreplied") return !fb.reply;
    if (filter === "replied") return !!fb.reply;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] flex items-center justify-center">
        <p className="text-sm text-[#8a7da0]">Loading...</p>
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-sm text-[#5a4a7a]">Admin access only</p>
          <a href="/" className="text-xs text-[#b0a3c4] mt-2 block">← Back to app</a>
        </div>
      </div>
    );
  }

  const unrepliedCount = feedbackList.filter((fb) => !fb.reply).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] p-6">
      <div className="max-w-lg md:max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#3d3155]">User Feedback</h1>
            <p className="text-xs text-[#8a7da0]">
              {feedbackList.length} total · {unrepliedCount} awaiting reply
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/admin" className="text-xs text-[#b0a3c4] hover:text-[#7c6a9e]">← Dashboard</a>
            <button
              onClick={loadFeedback}
              className="text-xs text-[#b0a3c4] hover:text-[#7c6a9e] cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "unreplied", "replied"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                filter === f
                  ? "bg-[#7c6a9e] text-white"
                  : "bg-white/60 text-[#5a4a7a] hover:bg-white/80"
              }`}
            >
              {f === "all" ? `All (${feedbackList.length})`
                : f === "unreplied" ? `Unreplied (${unrepliedCount})`
                : `Replied (${feedbackList.length - unrepliedCount})`}
            </button>
          ))}
        </div>

        {/* Feedback list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-[#8a7da0] text-center py-8">No feedback yet</p>
          )}
          {filtered.map((fb) => (
            <div key={fb.id} className={`bg-white/50 backdrop-blur-sm rounded-2xl p-4 ${!fb.reply ? "border-l-4 border-[#e8c4d8]" : ""}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs font-medium text-[#3d3155]">
                    {fb.user_email || (fb.user_id ? fb.user_id.slice(0, 8) + "..." : "Anonymous")}
                  </span>
                  <span className="text-xs text-[#b0a3c4] ml-2 font-mono">#{fb.id.slice(0, 8)}</span>
                </div>
                <span className="text-xs text-[#b0a3c4]">{formatDate(fb.created_at)}</span>
              </div>

              {/* Subject */}
              {fb.subject && (
                <p className="text-xs font-semibold text-[#7c6a9e] mb-1">{fb.subject}</p>
              )}

              {/* Message */}
              <p className="text-sm text-[#3d3155] mb-2">{fb.message}</p>

              {/* Reply */}
              {fb.reply && (
                <div className="pl-3 border-l-2 border-[#c4b5e0] mb-2">
                  <p className="text-xs text-[#5a4a7a]">↩ {fb.reply}</p>
                  <p className="text-xs text-[#b0a3c4] mt-0.5">
                    {fb.replied_at ? formatDate(fb.replied_at) : ""}
                  </p>
                </div>
              )}

              {/* Reply input */}
              {replyingTo === fb.id ? (
                <div className="mt-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Write a reply..."
                    className="w-full px-3 py-2 rounded-lg bg-white/60 border border-[#d8cfe8] text-[#3d3155] text-xs placeholder-[#b0a3c4] focus:outline-none focus:ring-2 focus:ring-[#c4b5e0] resize-none mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendReply(fb.id)}
                      className="text-xs px-4 py-1.5 rounded-full bg-[#7c6a9e] text-white cursor-pointer"
                    >
                      Send Reply
                    </button>
                    <button
                      onClick={() => { setReplyingTo(null); setReplyText(""); }}
                      className="text-xs px-4 py-1.5 rounded-full bg-white/60 text-[#5a4a7a] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 mt-1">
                  <button
                    onClick={() => { setReplyingTo(fb.id); setReplyText(fb.reply || ""); }}
                    className="text-xs text-[#7c6a9e] hover:text-[#5a4a7a] cursor-pointer font-medium"
                  >
                    {fb.reply ? "Edit reply" : "Reply"}
                  </button>
                  <button
                    onClick={() => deleteFeedback(fb.id)}
                    className="text-xs text-[#b0a3c4] hover:text-red-400 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
