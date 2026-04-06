"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface FeedbackEntry {
  id: string;
  subject: string | null;
  message: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function AboutPage() {
  const [subject, setSubject] = useState("");
  const [feedback, setFeedback] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [lastFeedbackId, setLastFeedbackId] = useState("");
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [myFeedback, setMyFeedback] = useState<FeedbackEntry[]>([]);
  const [zh, setZh] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setZh(localStorage.getItem("lang") === "zh");
    supabase.auth.getUser().then((res) => {
      const user = res.data.user;
      setUser(user);
      if (user) {
        loadMyFeedback(user.id);
        // Mark replies as seen
        localStorage.setItem("feedback-last-seen", new Date().toISOString());
      }
    });
  }, []);

  const loadMyFeedback = async (userId: string) => {
    const { data } = await supabase
      .from("feedback")
      .select("id, subject, message, reply, replied_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setMyFeedback(data);
  };

  const sendFeedback = async () => {
    if (!feedback.trim()) return;
    setSending(true);
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token || null;
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: feedback.trim(),
        subject: subject.trim() || null,
        email: contactEmail.trim() || null,
        accessToken,
      }),
    });
    const data = res.ok ? await res.json() : null;
    setSending(false);
    setSubject("");
    setFeedback("");
    setContactEmail("");
    setFeedbackSent(true);
    if (data?.id) setLastFeedbackId(data.id.slice(0, 8));
    if (user) loadMyFeedback(user.id);
    setTimeout(() => setFeedbackSent(false), 5000);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] p-6">
      <div className="max-w-lg md:max-w-2xl mx-auto">
        <a href="/" className="text-xs text-[#b0a3c4] hover:text-[#7c6a9e]">
          ← {zh ? "返回应用" : "Back to app"}
        </a>

        {/* About */}
        <h1 className="text-2xl font-bold text-[#3d3155] mt-4 mb-6">
          {zh ? "关于 Heal" : "About Heal"}
        </h1>
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <p className="text-sm text-[#5a4a7a] leading-relaxed mb-4">
            {zh
              ? "Heal 是一款免费的心理健康应用，帮助你追踪心情、练习正念、寻找平静——一次一个瞬间。"
              : "Heal is a free mental wellness app designed to help you track your mood, practice mindfulness, and find calm — one moment at a time."}
          </p>
          <div className="text-xs text-[#6b5b8a] leading-relaxed space-y-2">
            <p>🌈 <strong>{zh ? "心情" : "Mood"}</strong> — {zh ? "记录你的感受，自定义触发事件和应对标签，AI识别模式并给出个性化建议。关注你的心理健康趋势。" : "Check in with how you feel, create custom trigger and coping tags, get AI insights that notice your patterns. Wellness nudge when concerning patterns detected."}</p>
            <p>🍃 <strong>{zh ? "平静" : "Calm"}</strong> — {zh ? "引导呼吸练习、5-4-3-2-1接地练习、治愈照片和冥想音乐。PHQ-9抑郁和GAD-7焦虑免费自评，追踪你的心理健康。" : "Guided breathing, 5-4-3-2-1 grounding exercise, calming photos and meditation music. Free PHQ-9 depression and GAD-7 anxiety self-assessments to track your mental health."}</p>
            <p>🌱 <strong>{zh ? "成长" : "Grow"}</strong> — {zh ? "设定成长路径和步骤，AI规划，日记记录，内置日历调度，每周回顾和鼓励。" : "Set growth paths and steps, AI planning, journal entries, built-in calendar scheduling, weekly review with encouragement."}</p>
            <p>✨ <strong>{zh ? "我" : "Me"}</strong> — {zh ? "查看每日统计、连续天数，获取AI每周/每月情绪分析（支持朗读）。" : "Track your daily stats, streaks, and get AI-powered weekly/monthly mood analysis with read-aloud."}</p>
          </div>
        </div>

        {/* What's New */}
        <h2 className="text-xl font-bold text-[#3d3155] mb-4">
          🆕 {zh ? "最新功能" : "What's New"}
        </h2>
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="space-y-4 text-sm text-[#5a4a7a]">
            <div>
              <p className="font-semibold text-[#3d3155]">{zh ? "心理自评" : "Self Check-In"}</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "免费的PHQ-9抑郁筛查和GAD-7焦虑筛查。查看评分、严重程度和个性化建议。登录后追踪历史评分。" : "Free PHQ-9 depression and GAD-7 anxiety screening. See your score, severity level, and personalized guidance. Sign in to track scores over time."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#3d3155]">{zh ? "5-4-3-2-1 接地练习" : "5-4-3-2-1 Grounding"}</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "焦虑时的感官接地技术——看5样、听4种、摸3个、闻2种、尝1个，帮你回到当下。" : "Sensory grounding technique for anxiety — notice 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste. Brings you back to the present."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#3d3155]">{zh ? "自定义标签" : "Custom Tags"}</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "创建你自己的触发事件和应对方式标签，方便快速记录。" : "Create your own trigger and coping tags for quick mood logging."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#3d3155]">{zh ? "健康关注提醒" : "Wellness Nudge"}</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "当检测到连续低落情绪模式时，温柔地建议做一次自我评估。" : "When concerning mood patterns are detected, gently suggests a self check-in."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#3d3155]">{zh ? "智能心情记录" : "Smart Mood Tracking"}</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "记录触发事件和应对方式。AI识别历史模式并给出个性化建议。" : "Log what triggered your mood and what helped. AI detects patterns across your history and gives personalized responses."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#3d3155]">{zh ? "补录过去" : "Backfill Past Days"}</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "忘记记录了？点击日历图标，为过去任何日期补录心情和日记。" : "Forgot to log yesterday? Tap the calendar icon to record moods and journal entries for any past date."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#3d3155]">{zh ? "日记加密" : "Journal Encryption"}</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "日记条目使用AES-256加密存储。即使管理员也无法读取。" : "Your journal entries are now encrypted with AES-256 before being stored. Even database administrators cannot read them."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#3d3155]">{zh ? "Peacemind 洞察" : "Peacemind Insight"}</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "获取每日/每周/每月/每季度的情绪、日记和自评AI分析，支持朗读。" : "Get AI analysis of your mood, journal, and self-assessment patterns — daily, weekly, monthly, or quarterly. With read-aloud support."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#3d3155]">Spotify</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "推荐冥想播放列表，播放历史记录，在Spotify应用中播放完整曲目。" : "Suggested meditation playlists, playlist history with names, and Play in Spotify app for full playback."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#3d3155]">{zh ? "双向反馈" : "Two-way Feedback"}</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "发送反馈并查看我们团队的回复。你的声音对我们很重要。" : "Send feedback and see replies from our team. Your voice matters to us."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#3d3155]">{zh ? "双语" : "Bilingual"}</p>
              <p className="text-xs text-[#6b5b8a]">{zh ? "完整支持中文和英文，一键切换。" : "Full support for English and Chinese with one tap."}</p>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <h2 className="text-xl font-bold text-[#3d3155] mb-4">
          💬 {zh ? "反馈" : "Feedback"}
        </h2>
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 mb-6">
          {feedbackSent ? (
            <div className="text-center py-2">
              <p className="text-sm text-[#7c6a9e]">
                {zh ? "谢谢你的反馈！💜" : "Thank you for your feedback! 💜"}
              </p>
              {lastFeedbackId && (
                <p className="text-xs text-[#b0a3c4] mt-1">
                  {zh ? "参考编号：" : "Reference: "}#{lastFeedbackId}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-[#8a7da0] mb-3">
                {zh
                  ? "我们很想听到你的声音。分享你的想法、建议或报告问题。"
                  : "We'd love to hear from you. Share your thoughts, suggestions, or report an issue."}
              </p>
              <input
                type="text"
                placeholder={zh ? "主题" : "Subject"}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-[#d8cfe8] text-[#3d3155] placeholder-[#b0a3c4] focus:outline-none focus:ring-2 focus:ring-[#c4b5e0] text-sm mb-2"
              />
              <textarea
                placeholder={zh ? "详细描述..." : "Details..."}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-[#d8cfe8] text-[#3d3155] placeholder-[#b0a3c4] focus:outline-none focus:ring-2 focus:ring-[#c4b5e0] resize-none text-sm mb-2"
              />
              {!user && (
                <input
                  type="email"
                  placeholder={zh ? "邮箱（可选，用于回复）" : "Email (optional, for replies)"}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-[#d8cfe8] text-[#3d3155] placeholder-[#b0a3c4] focus:outline-none focus:ring-2 focus:ring-[#c4b5e0] text-sm mb-3"
                />
              )}
              <button
                onClick={sendFeedback}
                disabled={sending || !feedback.trim()}
                className="w-full py-2.5 rounded-xl bg-[#7c6a9e] text-white text-sm font-medium cursor-pointer hover:bg-[#6b5b8a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? (zh ? "发送中..." : "Sending...") : (zh ? "发送反馈" : "Send Feedback")}
              </button>
            </>
          )}
        </div>

        {/* My Feedback History */}
        {user && myFeedback.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#3d3155] mb-3">
              {zh ? "你的对话" : "Your conversations"}
            </h3>
            <div className="space-y-3">
              {myFeedback.map((fb) => (
                <div key={fb.id} className="bg-white/50 backdrop-blur-sm rounded-2xl p-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#7c6a9e] flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">
                      {zh ? "你" : "You"}
                    </div>
                    <div className="flex-1">
                      {fb.subject && (
                        <p className="text-xs font-semibold text-[#7c6a9e] mb-0.5">{fb.subject}</p>
                      )}
                      <p className="text-sm text-[#3d3155]">{fb.message}</p>
                      <p className="text-xs text-[#b0a3c4] mt-1">
                        {formatDate(fb.created_at)} · <span className="font-mono">#{fb.id.slice(0, 8)}</span>
                      </p>
                    </div>
                  </div>

                  {fb.reply ? (
                    <div className="flex gap-3 mt-3 pl-4 border-l-2 border-[#c4b5e0]">
                      <div className="w-6 h-6 rounded-full bg-[#e8c4d8] flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">
                        💜
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[#5a4a7a]">{fb.reply}</p>
                        <p className="text-xs text-[#b0a3c4] mt-1">
                          {fb.replied_at ? formatDate(fb.replied_at) : ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#b0a3c4] italic mt-2 pl-9">
                      {zh ? "等待回复..." : "Awaiting reply..."}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!user && (
          <p className="text-xs text-[#b0a3c4] text-center mb-6">
            {zh ? "登录后可查看你的反馈历史和回复。" : "Sign in to see your feedback history and replies."}
          </p>
        )}

        {/* Links */}
        <div className="flex gap-4 justify-center text-xs text-[#b0a3c4]">
          <a href="/privacy" className="hover:text-[#7c6a9e]">{zh ? "隐私政策" : "Privacy Policy"}</a>
          <a href="mailto:healingmindspace@proton.me" className="hover:text-[#7c6a9e]">{zh ? "联系我们" : "Contact"}</a>
        </div>
      </div>
    </div>
  );
}
