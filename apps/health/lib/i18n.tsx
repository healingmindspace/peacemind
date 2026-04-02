"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Lang = "en" | "zh";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Tabs
    "tab.today": "Today",
    "tab.track": "Track",
    "tab.meds": "Meds",
    "tab.insights": "Insights",

    // Greetings
    "greeting.morning": "Good morning",
    "greeting.afternoon": "Good afternoon",
    "greeting.evening": "Good evening",

    // Daily Check-in
    "checkin.title": "How are you feeling?",
    "checkin.subtitle": "A quick daily snapshot of your body",
    "checkin.energy": "Energy",
    "checkin.pain": "Pain",
    "checkin.sleep": "Sleep Quality",
    "checkin.low": "Low",
    "checkin.high": "High",
    "checkin.none": "None",
    "checkin.severe": "Severe",
    "checkin.poor": "Poor",
    "checkin.great": "Great",
    "checkin.notes": "Anything to note today?",
    "checkin.save": "Save Check-in",
    "checkin.saved": "Saved!",
    "checkin.already": "You've already checked in today",

    // Conditions
    "condition.diabetes": "Diabetes",
    "condition.immune": "Immune & Autoimmune",
    "condition.womens": "Women's Health",
    "condition.select": "Your Conditions",
    "condition.selectDesc": "Select conditions to track — you can change this anytime",

    // Blood Sugar
    "sugar.title": "Blood Sugar",
    "sugar.value": "Value (mg/dL)",
    "sugar.context": "Context",
    "sugar.fasting": "Fasting",
    "sugar.beforeMeal": "Before meal",
    "sugar.afterMeal": "After meal",
    "sugar.bedtime": "Bedtime",
    "sugar.log": "Log",
    "sugar.history": "Recent Readings",

    // Symptoms
    "symptom.title": "Symptoms",
    "symptom.log": "Log Symptom",
    "symptom.type": "Type",
    "symptom.severity": "Severity",
    "symptom.mild": "Mild",
    "symptom.moderate": "Moderate",
    "symptom.severe": "Severe",
    "symptom.triggers": "Possible triggers",
    "symptom.history": "Recent Symptoms",

    // Women's Health
    "womens.hotFlash": "Hot flash",
    "womens.nightSweat": "Night sweat",
    "womens.brainFog": "Brain fog",
    "womens.jointPain": "Joint pain",
    "womens.moodSwing": "Mood swing",
    "womens.insomnia": "Insomnia",
    "womens.fatigue": "Fatigue",
    "womens.anxiety": "Anxiety",
    "womens.cycle": "Period",
    "womens.headache": "Headache",

    // Medications
    "meds.title": "Medications & Supplements",
    "meds.add": "Add Medication",
    "meds.name": "Name",
    "meds.dose": "Dose",
    "meds.frequency": "Frequency",
    "meds.daily": "Daily",
    "meds.twiceDaily": "Twice daily",
    "meds.weekly": "Weekly",
    "meds.asNeeded": "As needed",
    "meds.taken": "Taken",
    "meds.skipped": "Skipped",

    // Insights
    "insights.title": "Health Insight",
    "insights.subtitle": "Patterns and trends from your data",
    "insights.generate": "Generate Insight",
    "insights.doctorPrep": "Doctor Visit Prep",
    "insights.doctorPrepDesc": "Generate a summary to bring to your appointment",

    // Auth
    "auth.signIn": "Sign in to track your health",

    // Crisis
    "crisis.needHelp": "Need help?",

    // General
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "done": "Done",
    "loading": "Loading...",
  },
  zh: {
    // Tabs
    "tab.today": "今日",
    "tab.track": "记录",
    "tab.meds": "用药",
    "tab.insights": "洞察",

    // Greetings
    "greeting.morning": "早上好",
    "greeting.afternoon": "下午好",
    "greeting.evening": "晚上好",

    // Daily Check-in
    "checkin.title": "今天感觉怎么样？",
    "checkin.subtitle": "快速记录身体状态",
    "checkin.energy": "精力",
    "checkin.pain": "疼痛",
    "checkin.sleep": "睡眠质量",
    "checkin.low": "低",
    "checkin.high": "高",
    "checkin.none": "无",
    "checkin.severe": "严重",
    "checkin.poor": "差",
    "checkin.great": "好",
    "checkin.notes": "今天有什么要记录的？",
    "checkin.save": "保存",
    "checkin.saved": "已保存！",
    "checkin.already": "今天已经记录过了",

    // Conditions
    "condition.diabetes": "糖尿病",
    "condition.immune": "免疫与自身免疫",
    "condition.womens": "女性健康",
    "condition.select": "你的健康状况",
    "condition.selectDesc": "选择要追踪的状况——随时可以更改",

    // Blood Sugar
    "sugar.title": "血糖",
    "sugar.value": "数值（mg/dL）",
    "sugar.context": "测量时间",
    "sugar.fasting": "空腹",
    "sugar.beforeMeal": "餐前",
    "sugar.afterMeal": "餐后",
    "sugar.bedtime": "睡前",
    "sugar.log": "记录",
    "sugar.history": "最近记录",

    // Symptoms
    "symptom.title": "症状",
    "symptom.log": "记录症状",
    "symptom.type": "类型",
    "symptom.severity": "严重程度",
    "symptom.mild": "轻度",
    "symptom.moderate": "中度",
    "symptom.severe": "重度",
    "symptom.triggers": "可能的诱因",
    "symptom.history": "最近症状",

    // Women's Health
    "womens.hotFlash": "潮热",
    "womens.nightSweat": "盗汗",
    "womens.brainFog": "脑雾",
    "womens.jointPain": "关节痛",
    "womens.moodSwing": "情绪波动",
    "womens.insomnia": "失眠",
    "womens.fatigue": "疲劳",
    "womens.anxiety": "焦虑",
    "womens.cycle": "月经",
    "womens.headache": "头痛",

    // Medications
    "meds.title": "药物与补充剂",
    "meds.add": "添加药物",
    "meds.name": "名称",
    "meds.dose": "剂量",
    "meds.frequency": "频率",
    "meds.daily": "每天",
    "meds.twiceDaily": "每天两次",
    "meds.weekly": "每周",
    "meds.asNeeded": "按需",
    "meds.taken": "已服",
    "meds.skipped": "跳过",

    // Insights
    "insights.title": "健康洞察",
    "insights.subtitle": "从你的数据中发现规律和趋势",
    "insights.generate": "生成洞察",
    "insights.doctorPrep": "就诊准备",
    "insights.doctorPrepDesc": "生成近期健康摘要，带去看医生",

    // Auth
    "auth.signIn": "登录以追踪你的健康",

    // Crisis
    "crisis.needHelp": "需要帮助？",

    // General
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "done": "完成",
    "loading": "加载中...",
  },
};

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("health-lang") as Lang | null;
    if (saved && (saved === "en" || saved === "zh")) {
      setLangState(saved);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("zh")) setLangState("zh");
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("health-lang", l);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    let text = translations[lang][key] || translations.en[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
