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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { lang } = useI18n();
  const { accessToken } = useAuth();

  // Speech-to-text
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = lang === "zh" ? "zh-CN" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalText = "";
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setInput(finalText + interim);
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
                    ? ["我今天心情不错", "帮我写日记", "这周报告", "怎么记录心情？", "什么是焦虑？", "数据安全吗？", "种子怎么用？", "呼吸练习怎么做？"]
                    : ["I'm feeling good today", "Write a journal for me", "Weekly review", "How do I log mood?", "What is anxiety?", "Is my data private?", "How do seeds work?", "How do breathing exercises work?"]
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
                  {msg.role === "assistant" && (
                    <button onClick={() => speak(msg.content)} className="mt-1 text-[9px] text-pm-text-muted hover:text-brand cursor-pointer">🔊</button>
                  )}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {msg.actions.map((a) => (
                        <span key={a} className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand/20 text-brand">
                          {a === "log_mood" ? "✅ mood" : a === "write_journal" ? "✅ journal" : a === "get_review" ? "📊 review" : a === "get_insight" ? "💡 insight" : a === "get_calendar" ? "📅 calendar" : a === "get_weather" ? "🌤️ weather" : a === "save_feedback" ? "💬 feedback" : a}
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
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? (lang === "zh" ? "正在听..." : "Listening...") : (lang === "zh" ? "问一个问题..." : "Ask a question...")}
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
