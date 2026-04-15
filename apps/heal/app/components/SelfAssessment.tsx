"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { awardSeeds } from "@/lib/seeds";

const PHQ9 = {
  type: "phq9" as const,
  title: { en: "Depression Screen (PHQ-9)", zh: "抑郁自评（PHQ-9）" },
  intro: {
    en: "Over the last 2 weeks, how often have you been bothered by the following?",
    zh: "在过去两周里，以下问题困扰你的频率是？",
  },
  questions: [
    { en: "Little interest or pleasure in doing things", zh: "做事缺乏兴趣或乐趣" },
    { en: "Feeling down, depressed, or hopeless", zh: "感到心情低落、沮丧或绝望" },
    { en: "Trouble falling or staying asleep, or sleeping too much", zh: "入睡困难、保持睡眠困难，或睡眠过多" },
    { en: "Feeling tired or having little energy", zh: "感到疲倦或精力不足" },
    { en: "Poor appetite or overeating", zh: "食欲不振或过度饮食" },
    { en: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down", zh: "对自己感到不满——觉得自己是失败者，或让自己和家人失望" },
    { en: "Trouble concentrating on things, such as reading or watching TV", zh: "注意力难以集中，比如阅读或看电视" },
    { en: "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless", zh: "行动或说话迟缓到别人可能注意到？或者相反——坐立不安" },
    { en: "Thoughts that you would be better off dead, or of hurting yourself", zh: "觉得自己死了会更好，或有伤害自己的念头" },
  ],
  severity: [
    { max: 4, en: "Minimal", zh: "极轻", color: "#7c6a9e" },
    { max: 9, en: "Mild", zh: "轻度", color: "#8a9e6a" },
    { max: 14, en: "Moderate", zh: "中度", color: "#c4a035" },
    { max: 19, en: "Moderately Severe", zh: "中重度", color: "#c47035" },
    { max: 27, en: "Severe", zh: "重度", color: "#c44035" },
  ],
};

const GAD7 = {
  type: "gad7" as const,
  title: { en: "Anxiety Screen (GAD-7)", zh: "焦虑自评（GAD-7）" },
  intro: {
    en: "Over the last 2 weeks, how often have you been bothered by the following?",
    zh: "在过去两周里，以下问题困扰你的频率是？",
  },
  questions: [
    { en: "Feeling nervous, anxious, or on edge", zh: "感到紧张、焦虑或不安" },
    { en: "Not being able to stop or control worrying", zh: "无法停止或控制担忧" },
    { en: "Worrying too much about different things", zh: "对各种事情过度担忧" },
    { en: "Trouble relaxing", zh: "难以放松" },
    { en: "Being so restless that it's hard to sit still", zh: "坐立不安，难以静坐" },
    { en: "Becoming easily annoyed or irritable", zh: "容易变得烦躁或易怒" },
    { en: "Feeling afraid, as if something awful might happen", zh: "感到害怕，好像会有可怕的事发生" },
  ],
  severity: [
    { max: 4, en: "Minimal", zh: "极轻", color: "#7c6a9e" },
    { max: 9, en: "Mild", zh: "轻度", color: "#8a9e6a" },
    { max: 14, en: "Moderate", zh: "中度", color: "#c4a035" },
    { max: 21, en: "Severe", zh: "重度", color: "#c44035" },
  ],
};

const OPTIONS = [
  { value: 0, en: "Not at all", zh: "完全没有" },
  { value: 1, en: "Several days", zh: "好几天" },
  { value: 2, en: "More than half the days", zh: "一半以上的天数" },
  { value: 3, en: "Nearly every day", zh: "几乎每天" },
];

type AssessmentType = "phq9" | "gad7";
type PastResult = { id: string; type: string; score: number; created_at: string };

interface SelfAssessmentProps {
  suggestedType?: AssessmentType | null;
}

export default function SelfAssessment({ suggestedType }: SelfAssessmentProps) {
  const { user, accessToken } = useAuth();
  const [activeTest, setActiveTest] = useState<AssessmentType | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<{ score: number; type: AssessmentType } | null>(null);
  const [pastResults, setPastResults] = useState<PastResult[]>([]);
  const [saving, setSaving] = useState(false);
  const { lang } = useI18n();
  const l = (obj: { en: string; zh: string }) => lang === "zh" ? obj.zh : obj.en;

  const test = activeTest === "phq9" ? PHQ9 : activeTest === "gad7" ? GAD7 : null;

  useEffect(() => {
    if (user && accessToken) loadHistory();
  }, [user, accessToken]);

  useEffect(() => {
    if (suggestedType && !activeTest && !result) {
      setActiveTest(suggestedType);
      setAnswers(new Array(suggestedType === "phq9" ? 9 : 7).fill(-1));
      setCurrentQ(0);
    }
  }, [suggestedType]);

  const loadHistory = async () => {
    if (!accessToken) return;
    const res = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", accessToken }),
    });
    const json = await res.json();
    if (json.data) setPastResults(json.data);
  };

  const startTest = (type: AssessmentType) => {
    const qCount = type === "phq9" ? 9 : 7;
    setActiveTest(type);
    setAnswers(new Array(qCount).fill(-1));
    setCurrentQ(0);
    setResult(null);
  };

  const selectAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = value;
    setAnswers(newAnswers);

    // Auto-advance after short delay
    if (test && currentQ < test.questions.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 200);
    }
  };

  const submit = async () => {
    if (!test || answers.some((a) => a < 0)) return;
    setSaving(true);
    const score = answers.reduce((sum, a) => sum + a, 0);
    // Only save to DB if logged in
    if (user && accessToken) {
      await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "insert", accessToken, type: test.type, score, answers }),
      });
      loadHistory();
    }
    setResult({ score, type: test.type });
    awardSeeds("assessment", accessToken);
    setSaving(false);
  };

  const getSeverity = (type: AssessmentType, score: number) => {
    const levels = type === "phq9" ? PHQ9.severity : GAD7.severity;
    return levels.find((s) => score <= s.max) || levels[levels.length - 1];
  };

  const reset = () => {
    setActiveTest(null);
    setAnswers([]);
    setCurrentQ(0);
    setResult(null);
  };

  // Result screen
  if (result) {
    const severity = getSeverity(result.type, result.score);
    const maxScore = result.type === "phq9" ? 27 : 21;
    const isHigh = result.score >= (result.type === "phq9" ? 15 : 15);
    const isConcerning = result.score >= (result.type === "phq9" ? 10 : 10);

    return (
      <div className="max-w-sm md:max-w-lg mx-auto text-center">
        <div className="bg-pm-surface rounded-2xl p-6">
          <p className="text-sm font-semibold text-pm-text mb-2">
            {l(result.type === "phq9" ? PHQ9.title : GAD7.title)}
          </p>
          <div className="relative w-24 h-24 mx-auto mb-3">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e8dff0" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={severity.color} strokeWidth="3"
                strokeDasharray={`${(result.score / maxScore) * 100} 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold" style={{ color: severity.color }}>{result.score}</span>
            </div>
          </div>
          <p className="text-sm font-medium" style={{ color: severity.color }}>{l(severity)}</p>
          <p className="text-xs text-pm-text-tertiary mt-1">{result.score} / {maxScore}</p>

          {/* Interpretation */}
          <div className="mt-4 text-left bg-pm-accent-light/50 rounded-xl p-3">
            {!isConcerning && (
              <p className="text-xs text-pm-text-secondary leading-relaxed">
                {lang === "zh"
                  ? "你的评分在正常范围内。继续关注自己的心理健康，保持良好的生活习惯。"
                  : "Your score is in the normal range. Keep taking care of your mental health and maintaining healthy habits."}
              </p>
            )}
            {isConcerning && !isHigh && (
              <p className="text-xs text-pm-text-secondary leading-relaxed">
                {lang === "zh"
                  ? "你的评分显示可能存在一些困扰。这很常见，也没有关系。试试呼吸练习、写日记，或和信任的人聊聊。"
                  : "Your score suggests some difficulty. This is common and okay. Try breathing exercises, journaling, or talking to someone you trust."}
              </p>
            )}
            {isHigh && (
              <>
                <p className="text-xs text-pm-text-secondary leading-relaxed">
                  {lang === "zh"
                    ? "你的评分较高。请记住，寻求帮助是勇敢的。建议你和专业人士或信任的人谈谈。"
                    : "Your score is elevated. Remember, seeking help is a sign of strength. Consider talking to a professional or someone you trust."}
                </p>
                <div className="mt-2 p-2 bg-pm-surface-active rounded-lg">
                  <p className="text-[10px] font-semibold text-pm-text-muted uppercase tracking-wide mb-1">
                    {lang === "zh" ? "危机资源" : "Crisis Resources"}
                  </p>
                  <p className="text-xs text-pm-text-secondary">
                    {lang === "zh" ? "美国：" : "US: "}<a href="tel:988" className="underline font-semibold">988</a>
                    {" · "}{lang === "zh" ? "中国：" : "China: "}<a href="tel:400-161-9995" className="underline font-semibold">400-161-9995</a>
                    {" · "}<a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">findahelpline.com</a>
                  </p>
                </div>
              </>
            )}
          </div>

          <p className="text-[10px] text-pm-text-muted italic mt-3">
            {lang === "zh"
              ? "这是筛查工具，不是诊断。如有疑虑，请咨询专业人士。"
              : "This is a screening tool, not a diagnosis. Consult a professional if you have concerns."}
          </p>

          {!user && (
            <p className="text-[10px] text-pm-text-muted mt-3">
              {lang === "zh" ? "登录后可保存和追踪你的历史评分。" : "Sign in to save and track your scores over time."}
            </p>
          )}

          <div className="flex justify-center gap-3 mt-4">
            <button onClick={reset} className="px-4 py-2 rounded-full text-xs bg-brand text-white cursor-pointer">
              {lang === "zh" ? "完成" : "Done"}
            </button>
            <button onClick={() => startTest(result.type)} className="px-4 py-2 rounded-full text-xs bg-pm-surface-active text-pm-text-secondary cursor-pointer">
              {lang === "zh" ? "重新测试" : "Retake"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active questionnaire
  if (test && activeTest) {
    const allAnswered = answers.every((a) => a >= 0);
    return (
      <div className="max-w-sm md:max-w-lg mx-auto">
        <div className="bg-pm-surface rounded-2xl p-5">
          <p className="text-sm font-semibold text-pm-text mb-1 text-center">{l(test.title)}</p>
          <p className="text-xs text-pm-text-tertiary mb-4 text-center">{l(test.intro)}</p>

          {/* Progress */}
          <div className="flex gap-1 mb-4">
            {test.questions.map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full transition-all ${answers[i] >= 0 ? "bg-brand" : i === currentQ ? "bg-brand-light" : "bg-pm-accent"}`} />
            ))}
          </div>

          {/* Current question */}
          <p className="text-xs text-pm-text-muted mb-1">{currentQ + 1} / {test.questions.length}</p>
          <p className="text-sm text-pm-text font-medium mb-4">{l(test.questions[currentQ])}</p>

          {/* Options */}
          <div className="space-y-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => selectAnswer(opt.value)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  answers[currentQ] === opt.value
                    ? "bg-brand text-white"
                    : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
                }`}
              >
                {l(opt)}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-4">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="px-3 py-1.5 rounded-full text-xs text-pm-text-secondary cursor-pointer disabled:opacity-30"
            >
              ← {lang === "zh" ? "上一题" : "Back"}
            </button>
            {currentQ < test.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                disabled={answers[currentQ] < 0}
                className="px-3 py-1.5 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40"
              >
                {lang === "zh" ? "下一题" : "Next"} →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!allAnswered || saving}
                className="px-4 py-1.5 rounded-full text-xs bg-brand text-white cursor-pointer disabled:opacity-40"
              >
                {saving ? "..." : (lang === "zh" ? "查看结果" : "See Results")}
              </button>
            )}
          </div>

          <button onClick={reset} className="mt-3 w-full text-[10px] text-pm-text-muted hover:text-brand cursor-pointer text-center">
            {lang === "zh" ? "取消" : "Cancel"}
          </button>
        </div>
      </div>
    );
  }

  // Selector + history
  return (
    <div className="max-w-sm md:max-w-lg mx-auto">
      <h3 className="text-lg font-semibold text-pm-text mb-1 text-center">
        {lang === "zh" ? "心理自评" : "Self Check-In"}
      </h3>
      <p className="text-xs text-pm-text-tertiary mb-4 text-center">
        {lang === "zh" ? "标准化筛查工具，帮助你了解自己" : "Validated screening tools to help you understand yourself"}
      </p>

      <div className="space-y-3">
        <button onClick={() => startTest("phq9")} className="w-full bg-pm-surface rounded-2xl p-4 text-left cursor-pointer hover:bg-white/70 transition-all">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌧️</span>
            <div>
              <p className="text-sm font-semibold text-pm-text">{l(PHQ9.title)}</p>
              <p className="text-xs text-pm-text-tertiary">{lang === "zh" ? "9 道题 · 约 2 分钟" : "9 questions · ~2 min"}</p>
            </div>
          </div>
        </button>

        <button onClick={() => startTest("gad7")} className="w-full bg-pm-surface rounded-2xl p-4 text-left cursor-pointer hover:bg-white/70 transition-all">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌊</span>
            <div>
              <p className="text-sm font-semibold text-pm-text">{l(GAD7.title)}</p>
              <p className="text-xs text-pm-text-tertiary">{lang === "zh" ? "7 道题 · 约 2 分钟" : "7 questions · ~2 min"}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Past results */}
      {pastResults.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-pm-text mb-2">
            {lang === "zh" ? "历史记录" : "Past Results"}
          </h4>
          <div className="space-y-2">
            {pastResults.slice(0, 10).map((r) => {
              const severity = getSeverity(r.type as AssessmentType, r.score);
              const maxScore = r.type === "phq9" ? 27 : 21;
              return (
                <div key={r.id} className="flex items-center gap-3 bg-pm-surface rounded-xl px-3 py-2">
                  <span className="text-lg">{r.type === "phq9" ? "🌧️" : "🌊"}</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-pm-text">
                      {l(r.type === "phq9" ? PHQ9.title : GAD7.title)}
                    </p>
                    <p className="text-[10px] text-pm-text-muted">
                      {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: severity.color }}>{r.score}/{maxScore}</p>
                    <p className="text-[10px]" style={{ color: severity.color }}>{l(severity)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] text-pm-text-muted italic mt-4 text-center">
        {lang === "zh"
          ? "这些是筛查工具，不是诊断。如有疑虑，请咨询专业人士。"
          : "These are screening tools, not diagnoses. Consult a professional if you have concerns."}
      </p>
    </div>
  );
}
