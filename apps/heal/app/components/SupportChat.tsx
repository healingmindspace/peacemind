"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

interface Message {
  role: "user" | "assistant";
  actions?: string[];
  content: string;
}

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { lang } = useI18n();
  const { accessToken } = useAuth();

  const [reminders, setReminders] = useState<string[]>([]);

  // Load personalized suggestions + today's reminders when chat opens
  useEffect(() => {
    if (!open) return;
    if (suggestions.length === 0) {
      fetch("/api/agent-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, lang }),
      })
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setSuggestions(data); })
        .catch(() => {});
    }
    if (accessToken && reminders.length === 0) {
      fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "__reminders__",
          history: [],
          accessToken,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          utcOffset: new Date().getTimezoneOffset(),
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.reminders && data.reminders.length > 0) setReminders(data.reminders);
        })
        .catch(() => {});
    }
  }, [open]);

  // Speech-to-text
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = lang === "zh" ? "zh-CN" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: any) => {
      if (!recognitionRef.current) return;
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setInput(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  // Text-to-speech (browser built-in)
  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "zh" ? "zh-CN" : "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if a string is only emojis (and whitespace)
  const isEmojiOnly = (text: string): boolean => {
    const stripped = text.replace(/\s/g, "");
    if (!stripped) return false;
    const emojiRegex = /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D\u20E3\uFE0E\s]+$/u;
    return emojiRegex.test(stripped);
  };

  const logEmojiMood = async (emojis: string) => {
    if (!accessToken) return;
    // Score the emojis
    const great = "🥳🤩😍🥰🎉💪✨🌟😎🤗💃🕺🏆🎊👏";
    const good = "😊🙂😄😁👍🌈☺️😌🫶🙏💚🍀😋🤭";
    const low = "😔😞😓😟🥺😿💔🫤😕☹️😩🤕";
    const struggling = "😢😭😰😱💀👎😡😤🤬😖😫🆘😵🤮";
    let label = "Neutral";
    for (const ch of emojis) {
      if (great.includes(ch)) { label = "Great"; break; }
      if (good.includes(ch)) { label = "Good"; break; }
      if (low.includes(ch)) { label = "Low"; break; }
      if (struggling.includes(ch)) { label = "Struggling"; break; }
    }

    const res = await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "insert",
        accessToken,
        emoji: emojis,
        label,
        trigger: null,
        helped: null,
      }),
    });
    const data = await res.json();
    if (data?.id) {
      // Request AI response
      fetch("/api/mood-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          mood: { emoji: emojis, label },
          trigger: null,
          helped: null,
          moodId: data.id,
          lang,
        }),
      });
    }
    return label;
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    if (listening) { recognitionRef.current?.stop(); recognitionRef.current = null; setListening(false); }
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    // Emoji-only message → log as mood
    if (isEmojiOnly(userMsg)) {
      const label = await logEmojiMood(userMsg);
      const confirmMsg = lang === "zh"
        ? `已记录 ${userMsg} (${label})。你可以在心情记录中查看。`
        : `Logged ${userMsg} as "${label}". You can see it in your mood history.`;
      setMessages((prev) => [...prev, { role: "assistant", content: confirmMsg }]);
      setSending(false);
      return;
    }

    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.slice(-10),
          accessToken,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          utcOffset: new Date().getTimezoneOffset(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.response, actions: data.actions }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: lang === "zh" ? "抱歉，出了点问题。请再试一次。" : "Sorry, something went wrong. Please try again." }]);
    }
    setSending(false);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-12 h-12 rounded-full bg-brand text-white shadow-lg flex items-center justify-center text-xl cursor-pointer hover:bg-brand-hover transition-all z-50"
          title={lang === "zh" ? "需要帮助？" : "Need help?"}
        >
          💬
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-16 right-3 w-72 max-h-[70vh] md:bottom-6 md:right-6 md:w-80 md:max-h-[28rem] rounded-2xl border border-pm-border shadow-xl flex flex-col z-50 overflow-hidden" style={{ backgroundColor: "#f8f4fc" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-pm-border bg-brand text-white rounded-t-2xl">
            <span className="text-sm font-semibold">{lang === "zh" ? "🌱 Peacemind 助手" : "🌱 Peacemind Help"}</span>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="text-white/60 hover:text-white cursor-pointer text-[10px]" title={lang === "zh" ? "重新开始" : "Start over"}>🏠</button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white cursor-pointer text-sm">✕</button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[12rem]">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-pm-text-secondary">
                  {(() => {
                    const h = new Date().getHours();
                    if (lang === "zh") {
                      if (h < 12) return "🌅 早上好！新的一天，你已经很棒了。";
                      if (h < 17) return "☀️ 下午好！记得休息一下，深呼吸。";
                      return "🌙 晚上好！今天辛苦了，你做得很好。";
                    }
                    if (h < 12) return "🌅 Good morning! Showing up is already a win.";
                    if (h < 17) return "☀️ Good afternoon! Remember to pause and breathe.";
                    return "🌙 Good evening! You made it through today — that matters.";
                  })()}
                </p>
                {reminders.length > 0 && (
                  <div className="mt-2 text-left bg-pm-surface-active rounded-xl p-2.5 space-y-1">
                    <p className="text-[10px] font-semibold text-pm-text-secondary">{lang === "zh" ? "📅 今日提醒" : "📅 Today's reminders"}</p>
                    {reminders.map((r, i) => (
                      <p key={i} className="text-[10px] text-pm-text-secondary">• {r}</p>
                    ))}
                  </div>
                )}
                <details className="mt-2 text-left">
                  <summary className="text-[10px] text-pm-text-muted cursor-pointer hover:text-brand">
                    ✨ {lang === "zh" ? "最新更新" : "What's new"}
                  </summary>
                  <div className="mt-1 space-y-1 text-[10px] text-pm-text-tertiary">
                    <p>🎤 Talk to the agent by voice</p>
                    <p>📅 Add tasks by saying "add meeting tomorrow 3pm"</p>
                    <p>🌤️ Ask about the weather</p>
                    <p>📊 Get a weekly wellness review</p>
                    <p>📅 Month view on calendar</p>
                    <p>🔗 Link journal entries to paths</p>
                  </div>
                </details>
                <p className="text-[9px] text-pm-text-muted mt-1">
                  🕐 {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {(suggestions.length > 0 ? suggestions : (lang === "zh"
                    ? ["今天有什么安排？", "我今天心情不错", "帮我写日记", "这周报告"]
                    : ["What's on my calendar?", "I'm feeling good today", "Write a journal for me", "Weekly review"])
                  ).map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="px-2.5 py-1 rounded-full text-[10px] bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                  msg.role === "user"
                    ? "bg-brand text-white rounded-br-sm"
                    : "bg-pm-surface-active text-pm-text rounded-bl-sm"
                }`}>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                  {msg.role === "assistant" && (
                    <button onClick={() => speak(msg.content)} className="mt-1 text-[9px] text-pm-text-muted hover:text-brand cursor-pointer">🔊</button>
                  )}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {msg.actions.map((a) => (
                        <span key={a} className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand/20 text-brand">
                          {a === "log_mood" ? "✅ mood" : a === "write_journal" ? "✅ journal" : a === "get_review" ? "📊 review" : a === "get_insight" ? "💡 insight" : a === "get_calendar" ? "📅 calendar" : a === "create_task" ? "✅ added" : a === "get_weather" ? "🌤️ weather" : a === "save_feedback" ? "💬 feedback" : a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl bg-pm-surface-active text-pm-text-muted text-xs rounded-bl-sm">...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={send} className="flex items-center gap-1.5 px-3 py-2 border-t border-pm-border">
            <button
              type="button"
              onClick={() => { if (listening) { recognitionRef.current?.stop(); setListening(false); } else { startListening(); } }}
              disabled={sending}
              className={`px-2 py-1.5 rounded-full text-xs cursor-pointer transition-all ${listening ? "bg-red-400 text-white animate-pulse" : "bg-pm-surface-active text-pm-text-muted hover:text-brand"}`}
            >
              🎤
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? (lang === "zh" ? "正在听..." : "Listening...") : (lang === "zh" ? "问一个问题..." : "Ask a question...")}
                disabled={sending}
                className="w-full px-3 py-1.5 pr-7 rounded-full border border-pm-border focus:outline-none focus:border-brand text-xs bg-pm-surface disabled:opacity-50"
              autoFocus
              />
              {input && (
                <button
                  type="button"
                  onClick={() => { setInput(""); if (listening) { recognitionRef.current?.stop(); recognitionRef.current = null; setListening(false); } }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-pm-text-muted hover:text-red-400 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-3 py-1.5 rounded-full bg-brand text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
            >
              {lang === "zh" ? "发送" : "Send"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
