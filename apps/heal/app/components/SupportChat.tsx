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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { lang } = useI18n();
  const { accessToken } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.slice(-10),
          accessToken,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.response, actions: data.actions }]);
      }
    } catch { /* ignore */ }
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
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-80 md:max-h-[28rem] md:rounded-2xl border border-pm-border shadow-xl flex flex-col z-50 overflow-hidden" style={{ backgroundColor: "#f8f4fc" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-pm-border bg-brand text-white rounded-t-2xl">
            <span className="text-sm font-semibold">{lang === "zh" ? "🌱 Peacemind 助手" : "🌱 Peacemind Help"}</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white cursor-pointer text-sm">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[12rem]">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-pm-text-secondary">
                  {lang === "zh" ? "你好！有什么可以帮你的？" : "Hi! How can I help you?"}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {(lang === "zh"
                    ? ["怎么记录心情？", "数据安全吗？", "种子怎么用？"]
                    : ["How do I log mood?", "Is my data private?", "How do seeds work?"]
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
                  {msg.content}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {msg.actions.map((a) => (
                        <span key={a} className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand/20 text-brand">
                          {a === "log_mood" ? "✅ mood logged" : a === "write_journal" ? "✅ journal saved" : a === "get_review" ? "📊 review" : a === "save_feedback" ? "💬 feedback saved" : a}
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
          <form onSubmit={send} className="flex items-center gap-2 px-3 py-2 border-t border-pm-border">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === "zh" ? "问一个问题..." : "Ask a question..."}
              disabled={sending}
              className="flex-1 px-3 py-1.5 rounded-full border border-pm-border focus:outline-none focus:border-brand text-xs bg-pm-surface disabled:opacity-50"
              autoFocus
            />
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
