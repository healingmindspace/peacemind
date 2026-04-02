"use client";

import { useState, useEffect } from "react";

export default function SecurityPage() {
  const [zh, setZh] = useState(false);

  useEffect(() => {
    setZh(localStorage.getItem("lang") === "zh");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6f0] via-[#f0e6f6] to-[#e8dff0] p-6">
      <div className="max-w-lg md:max-w-2xl mx-auto">
        <a href="/" className="text-xs text-[#b0a3c4] hover:text-[#7c6a9e]">
          ← {zh ? "返回应用" : "Back to app"}
        </a>
        <h1 className="text-2xl font-bold text-[#3d3155] mt-4 mb-2">
          {zh ? "你的数据如何被保护" : "How We Protect You"}
        </h1>
        <p className="text-sm text-[#8a7da0] mb-8">
          {zh ? "不是法律文件。是我们的承诺。" : "Not a legal document. A promise."}
        </p>

        <div className="space-y-6">
          {/* Encryption */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔐</span>
              <div>
                <h2 className="text-base font-semibold text-[#3d3155] mb-2">
                  {zh ? "我们读不到你的心事" : "We can't read your feelings"}
                </h2>
                <p className="text-sm text-[#5a4a7a] leading-relaxed">
                  {zh
                    ? "你的日记、心情触发因素、应对方法和AI回复在存储前都经过AES-256-GCM加密——这是银行级别的加密。即使有人入侵了我们的数据库，他们看到的也只是乱码。即使是我们的工程师也无法阅读你的内容。"
                    : "Your journal entries, mood triggers, coping methods, and AI responses are encrypted with AES-256-GCM before they're stored — the same encryption banks use. If someone broke into our database, all they'd see is scrambled text. Even our own engineers can't read your content."}
                </p>
              </div>
            </div>
          </div>

          {/* No tracking */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👁️‍🗨️</span>
              <div>
                <h2 className="text-base font-semibold text-[#3d3155] mb-2">
                  {zh ? "零追踪器。零广告。" : "Zero trackers. Zero ads. Zero exceptions."}
                </h2>
                <p className="text-sm text-[#5a4a7a] leading-relaxed">
                  {zh
                    ? "没有Google Analytics。没有Facebook Pixel。没有广告SDK。没有任何第三方追踪脚本。我们不知道你在哪个页面停留了多久，也不想知道。你的治愈之旅只属于你自己。"
                    : "No Google Analytics. No Facebook Pixel. No ad SDKs. No third-party tracking scripts of any kind. We don't know which page you stared at the longest, and we don't want to. Your healing journey is yours alone."}
                </p>
              </div>
            </div>
          </div>

          {/* No account needed */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🙈</span>
              <div>
                <h2 className="text-base font-semibold text-[#3d3155] mb-2">
                  {zh ? "不用注册就能使用" : "Use it without signing up"}
                </h2>
                <p className="text-sm text-[#5a4a7a] leading-relaxed">
                  {zh
                    ? "你不需要提供邮箱、姓名或任何信息就可以开始使用。数据保存在你的设备上。当你准备好了，可以创建账号来跨设备同步——但这完全是你的选择。"
                    : "You don't need to give us your email, name, or anything to start. Your data stays on your device. When you're ready, you can create an account to sync across devices — but that's entirely your choice."}
                </p>
              </div>
            </div>
          </div>

          {/* Your data, your control */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🗑️</span>
              <div>
                <h2 className="text-base font-semibold text-[#3d3155] mb-2">
                  {zh ? "删除即消失" : "Delete means gone"}
                </h2>
                <p className="text-sm text-[#5a4a7a] leading-relaxed">
                  {zh
                    ? "没有30天等待期。没有「我们保留备份」的借口。你删除一条心情记录，它就从数据库中永久消失。你删除账号，一切都消失。我们没有理由留住你不想保留的东西。"
                    : "No 30-day waiting period. No \"we keep backups\" excuse. When you delete a mood entry, it's permanently removed from our database. When you delete your account, everything goes. We have no reason to keep what you don't want kept."}
                </p>
              </div>
            </div>
          </div>

          {/* AI privacy */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h2 className="text-base font-semibold text-[#3d3155] mb-2">
                  {zh ? "AI不会记住你" : "AI doesn't remember you"}
                </h2>
                <p className="text-sm text-[#5a4a7a] leading-relaxed">
                  {zh
                    ? "当Peacemind为你生成回复时，你的文字会发送给AI处理然后立即丢弃。AI不会存储、学习或记住你的对话。每次回复都是全新的。你的话只存在于你的加密记录中。"
                    : "When Peacemind generates a response for you, your text is sent to the AI, processed, and immediately discarded. The AI doesn't store, learn from, or remember your conversations. Every response starts fresh. Your words only live in your encrypted records."}
                </p>
              </div>
            </div>
          </div>

          {/* Revenue model */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💚</span>
              <div>
                <h2 className="text-base font-semibold text-[#3d3155] mb-2">
                  {zh ? "我们靠什么活着" : "How we stay alive"}
                </h2>
                <p className="text-sm text-[#5a4a7a] leading-relaxed">
                  {zh
                    ? "Peacemind永远免费。我们不会出售你的数据。不会。永远不会。我们通过可选的高级功能（如跨应用洞察）来维持运营。核心的治愈功能——心情追踪、呼吸、日记——将永远对每个人免费。"
                    : "Peacemind is free, forever. We don't sell your data. Won't. Ever. We sustain ourselves through optional premium features like cross-app insights. The core healing features — mood tracking, breathing, journaling — will always be free for everyone."}
                </p>
              </div>
            </div>
          </div>

          {/* Open source */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📖</span>
              <div>
                <h2 className="text-base font-semibold text-[#3d3155] mb-2">
                  {zh ? "别信我们的话——看代码" : "Don't trust our words — read our code"}
                </h2>
                <p className="text-sm text-[#5a4a7a] leading-relaxed">
                  {zh
                    ? "Peacemind是开源的。每一行代码都是公开的。任何人都可以验证我们的加密是否真实、是否有隐藏追踪器、你的数据到底去了哪里。透明不只是政策——它在代码里。"
                    : "Peacemind is open source. Every line of code is public. Anyone can verify that our encryption is real, that there are no hidden trackers, and that your data goes exactly where we say it does. Transparency isn't just a policy — it's in the code."}
                </p>
                <a
                  href="https://github.com/healingmindspace/peacemind"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 rounded-full text-xs font-medium bg-[#f0e6f6] text-[#7c6a9e] hover:bg-[#e8dff0] transition-all"
                >
                  {zh ? "查看源代码 →" : "View source code →"}
                </a>
              </div>
            </div>
          </div>

          {/* Security practices */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <h2 className="text-base font-semibold text-[#3d3155] mb-2">
                  {zh ? "技术细节" : "Under the hood"}
                </h2>
                <ul className="text-sm text-[#5a4a7a] leading-relaxed space-y-2">
                  <li>{zh ? "✓ AES-256-GCM 加密敏感字段" : "✓ AES-256-GCM encryption on all sensitive fields"}</li>
                  <li>{zh ? "✓ 数据库行级安全（用户只能看到自己的数据）" : "✓ Row-level security (you can only see your own data)"}</li>
                  <li>{zh ? "✓ 所有API服务器端处理（客户端无数据库访问）" : "✓ All API calls server-side (no database access from client)"}</li>
                  <li>{zh ? "✓ 速率限制防止滥用" : "✓ Rate limiting on all endpoints"}</li>
                  <li>{zh ? "✓ 自动安全审计（每次代码更新）" : "✓ Automated security audits on every code change"}</li>
                  <li>{zh ? "✓ HTTPS 全程加密传输" : "✓ HTTPS everywhere — encrypted in transit"}</li>
                  <li>{zh ? "✓ 零第三方追踪脚本" : "✓ Zero third-party tracking scripts"}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Why */}
          <div className="bg-[#f0e6f6]/40 rounded-2xl p-6 text-center">
            <p className="text-sm text-[#5a4a7a] leading-relaxed italic">
              {zh
                ? "我们做这些不是因为法律要求。而是因为你把最脆弱的时刻交给了我们——你的焦虑、你的眼泪、你凌晨两点的想法。这份信任值得被认真对待。"
                : "We do this not because the law requires it. We do it because you're trusting us with your most vulnerable moments — your anxieties, your tears, your 2am thoughts. That trust deserves to be taken seriously."}
            </p>
          </div>

          {/* Contact */}
          <p className="text-center text-xs text-[#8a7da0]">
            {zh ? "对安全有疑问？请联系 " : "Questions about security? Reach us at "}
            <a href="mailto:healingmindspace@proton.me" className="underline font-medium">
              healingmindspace@proton.me
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
