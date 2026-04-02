"use client";

import { useState, useEffect } from "react";

export default function PrivacyPolicy() {
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
        <h1 className="text-2xl font-bold text-[#3d3155] mt-4 mb-6">
          {zh ? "隐私政策" : "Privacy Policy"}
        </h1>
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 space-y-4 text-sm text-[#5a4a7a] leading-relaxed">
          <p>
            <strong>{zh ? "最后更新：" : "Last updated:"}</strong> {zh ? "2026年3月29日" : "March 29, 2026"}
          </p>

          <h2 className="text-base font-semibold text-[#3d3155]">
            {zh ? "我们收集什么" : "What we collect"}
          </h2>
          <p>
            {zh
              ? "当你创建账户时，我们会存储你的邮箱地址（或显示名称）用于身份验证。使用应用时，我们会存储："
              : "When you create an account, we store your email address (or display name) for authentication. When you use the app, we store:"}
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>{zh ? "心情记录（表情、标签和可选的事件触发）" : "Mood entries (emoji, label, and optional event triggers)"}</li>
            <li>{zh ? "日记条目（你的文字和AI回复）" : "Journal entries (your text and AI responses)"}</li>
            <li>{zh ? "呼吸练习完成记录" : "Breathing session completions"}</li>
            <li>{zh ? "你上传到放松室的照片" : "Photos you upload to the Relax room"}</li>
            <li>{zh ? "音乐播放列表偏好" : "Music playlist preferences"}</li>
            <li>{zh ? "你发送的反馈消息" : "Feedback messages you send"}</li>
          </ul>

          <h2 className="text-base font-semibold text-[#3d3155]">
            {zh ? "加密与数据保护" : "Encryption & data protection"}
          </h2>
          <p>
            {zh
              ? "你的隐私是我们的首要任务。日记条目和AI回复在存储到数据库之前使用 AES-256-GCM 加密。这意味着："
              : "Your privacy is our priority. Journal entries and AI responses are encrypted using AES-256-GCM encryption before being stored in our database. This means:"}
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              {zh
                ? "你的日记文字在数据库中不可读——即使是系统管理员也无法查看"
                : "Your journal text is unreadable in the database — even to system administrators"}
            </li>
            <li>
              {zh
                ? "只有应用服务器才能使用安全的加密密钥解密你的条目"
                : "Only the application server can decrypt your entries using a secure encryption key"}
            </li>
            <li>
              {zh ? "旧条目向后兼容并受到保护" : "Old entries are backward-compatible and protected"}
            </li>
          </ul>
          <p>
            {zh
              ? "此外，每个用户只能通过数据库级别的行级安全策略访问自己的数据。"
              : "Additionally, each user can only access their own data through row-level security policies enforced at the database level."}
          </p>

          <h2 className="text-base font-semibold text-[#3d3155]">
            {zh ? "我们如何使用你的数据" : "How we use your data"}
          </h2>
          <p>
            {zh
              ? "你的数据仅用于提供应用功能——心情追踪、写日记、呼吸练习、照片放松和AI生成的回复与洞察。当你写日记时，文本会由AI服务处理以生成支持性回复——AI在处理后不会保留或存储你的文本。我们不会出售、分享或将你的数据用于广告。"
              : "Your data is used solely to provide the app's features — mood tracking, journaling, breathing exercises, photo relaxation, and AI-generated responses and insights. When you write a journal entry, the text is processed by an AI service to generate a supportive response — the AI does not retain or store your text after processing. We do not sell, share, or use your data for advertising."}
          </p>

          <h2 className="text-base font-semibold text-[#3d3155]">
            {zh ? "数据存储" : "Data storage"}
          </h2>
          <p>
            {zh
              ? "你的数据安全存储在云基础设施上，传输和静态数据均加密。照片存储在仅你可访问的私有存储中。匿名访问追踪仅使用IP地址进行使用统计——不会将个人数据与访问关联。"
              : "Your data is stored securely on cloud infrastructure with encryption at rest and in transit. Photos are stored in private storage buckets accessible only to you. Anonymous visit tracking uses IP addresses for usage statistics only — no personal data is associated with visits."}
          </p>

          <h2 className="text-base font-semibold text-[#3d3155]">
            {zh ? "数据删除" : "Data deletion"}
          </h2>
          <p>
            {zh
              ? "你可以随时在应用内删除单条心情记录、日记条目和照片。删除的数据会从我们的数据库中永久移除。如需删除整个账户及所有相关数据，请联系我们。"
              : "You can delete individual mood entries, journal entries, and photos at any time within the app. Deleted data is permanently removed from our database. To delete your entire account and all associated data, please contact us."}
          </p>

          <h2 className="text-base font-semibold text-[#3d3155]">
            {zh ? "外部服务" : "External services"}
          </h2>
          <p>
            {zh
              ? "本应用使用可信赖的云服务进行托管、身份验证、数据存储和AI处理。当你选择连接音乐服务时，我们仅访问你的播放列表名称——绝不修改你的账户。放松室中的库存照片来自免版税图片提供商。"
              : "The app uses trusted cloud services for hosting, authentication, data storage, and AI processing. When you optionally connect a music service, we only access your playlist names — we never modify your account. Stock photos in the Relax room are sourced from a royalty-free image provider."}
          </p>

          <h2 className="text-base font-semibold text-[#3d3155]">
            {zh ? "非医疗建议" : "Not medical advice"}
          </h2>
          <p>
            {zh
              ? "本应用是一个健康工具，不是医疗设备。AI回复本质上是支持性的，不应被视为专业的心理健康建议。如果你正处于危机中，请拨打或发短信至988自杀与危机生命热线（988），或发送 HELLO 至危机短信热线（741741）。"
              : "This app is a wellness tool, not a medical device. AI responses are supportive in nature and should not be treated as professional mental health advice. If you are in crisis, please contact the 988 Suicide & Crisis Lifeline (call or text 988) or Crisis Text Line (text HELLO to 741741)."}
          </p>

          <h2 className="text-base font-semibold text-[#3d3155]">
            {zh ? "联系我们" : "Contact"}
          </h2>
          <p>
            {zh ? "对此政策有疑问？请发邮件至 " : "Questions about this policy? Email "}
            <a
              href="mailto:healingmindspace@proton.me"
              className="underline font-medium"
            >
              healingmindspace@proton.me
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
