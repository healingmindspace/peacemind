import { definePlugin } from "@peacemind/plugin-sdk";
import MoodTracker from "./components/MoodTracker";

export default definePlugin({
  id: "mood",
  name: "Mood Tracker",
  icon: "🌈",
  version: "1.0.0",

  tables: [
    {
      name: "moods",
      encryptedFields: ["trigger", "helped", "response"],
    },
    {
      name: "mood_options",
    },
  ],

  entityPrefixes: ["mood", "mopt"],

  rateLimits: {
    crud: { max: 100, window: "1h" },
    ai: { max: 20, window: "1h" },
  },

  publishes: ["mood.logged", "mood.deleted"],
  subscribes: [],

  permissions: ["storage:photos", "ai:generate"],

  TabComponent: MoodTracker,

  i18n: {
    en: {
      "tab.mood": "Mood",
      "mood.title": "How are you feeling?",
      "mood.subtitle": "No judgment — just checking in",
      "mood.limit": "You've logged 5 moods today — come back tomorrow!",
      "mood.good": "Good",
      "mood.okay": "Okay",
      "mood.neutral": "Neutral",
      "mood.low": "Low",
      "mood.struggling": "Struggling",
      "mood.whatHappened": "What happened?",
      "mood.whatHelped": "What helped?",
      "mood.skip": "Skip",
      "mood.done": "Done",
      "mood.recent": "Recent moods",
      "mood.loadMore": "Load more",
      "mood.yourMood": "Your mood",
      "mood.signIn": "Sign in to save and track your moods",
      "mood.growSuggestion": "Would you like Peacemind to help with this?",
      "mood.growFromHistory": "Plan with Peacemind",
      "mood.photoMood": "Take photo",
      "mood.uploadMood": "Upload",
      "mood.readingPhoto": "Reading photo...",
    },
    zh: {
      "tab.mood": "心情",
      "mood.title": "你现在感觉怎么样？",
      "mood.subtitle": "不带评判 — 只是关心",
      "mood.limit": "今天已记录5次 — 明天再来吧！",
      "mood.good": "很好",
      "mood.okay": "还行",
      "mood.neutral": "一般",
      "mood.low": "低落",
      "mood.struggling": "挣扎",
      "mood.whatHappened": "发生了什么？",
      "mood.whatHelped": "什么帮到了你？",
      "mood.skip": "跳过",
      "mood.done": "完���",
      "mood.recent": "最近心情",
      "mood.loadMore": "加载更多",
      "mood.yourMood": "你的心情",
      "mood.signIn": "登录以保存和追踪你的心情",
      "mood.growSuggestion": "你想让 Peacemind 帮助你吗？",
      "mood.growFromHistory": "让 Peacemind 规划",
      "mood.photoMood": "拍照",
      "mood.uploadMood": "上传",
      "mood.readingPhoto": "正在分析照片...",
    },
  },
});
