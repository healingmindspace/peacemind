"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import BreathingExercise from "./BreathingExercise";
import GroundingExercise from "./GroundingExercise";
import RainOnWindow from "./RainOnWindow";
import OneMinutePause from "./OneMinutePause";
import RelaxTab from "./RelaxTab";
import SelfAssessment from "./SelfAssessment";

type CalmSubTab = "calm" | "checkin" | "learn";

export default function CalmTab({ suggestedAssessment }: { suggestedAssessment?: "phq9" | "gad7" | null }) {
  const [subTab, setSubTab] = useState<CalmSubTab>(suggestedAssessment ? "checkin" : "calm");
  const { t, lang } = useI18n();

  const tabLabels: Record<CalmSubTab, string> = {
    calm: t("calm.breatheRelax"),
    checkin: lang === "zh" ? "自评" : "Check-In",
    learn: t("calm.learn"),
  };

  return (
    <div>
      {/* Sub-tab nav */}
      <div className="flex justify-center gap-2 pt-4 mb-2">
        {(["calm", "checkin", "learn"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              subTab === tab
                ? "bg-brand text-white"
                : "bg-pm-surface-active text-pm-text-secondary hover:bg-pm-surface-hover"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {subTab === "calm" && (
        <>
          <BreathingExercise />
          <GroundingExercise />
          <div className="border-t border-pm-accent/50 mt-4" />
          <OneMinutePause />
          <div className="border-t border-pm-accent/50 mt-4" />
          <RainOnWindow />
          <div className="border-t border-pm-accent/50 mt-4" />
          <RelaxTab />
        </>
      )}

      {subTab === "checkin" && (
        <section className="py-6 px-4">
          <SelfAssessment suggestedType={suggestedAssessment} />
        </section>
      )}

      {subTab === "learn" && <LearnSection />}
    </div>
  );
}

function LearnSection() {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<string | null>(null);

  const topics = [
    {
      id: "emotions",
      icon: "💛",
      title: t("learn.emotionsTitle"),
      what: t("learn.emotionsWhat"),
      signs: t("learn.emotionsSigns"),
      help: t("learn.emotionsHelp"),
    },
    {
      id: "anxiety",
      icon: "🌊",
      title: t("learn.anxietyTitle"),
      what: t("learn.anxietyWhat"),
      signs: t("learn.anxietySigns"),
      help: t("learn.anxietyHelp"),
    },
    {
      id: "depression",
      icon: "🌧️",
      title: t("learn.depressionTitle"),
      what: t("learn.depressionWhat"),
      signs: t("learn.depressionSigns"),
      help: t("learn.depressionHelp"),
    },
    {
      id: "coping",
      icon: "🌿",
      title: t("learn.copingTitle"),
      what: t("learn.copingWhat"),
      signs: "",
      help: t("learn.copingHelp"),
    },
    {
      id: "support",
      icon: "🤝",
      title: t("learn.supportTitle"),
      what: t("learn.supportWhat"),
      signs: "",
      help: t("learn.supportHelp"),
    },
    {
      id: "habits",
      icon: "🌅",
      title: t("learn.habitsTitle"),
      what: t("learn.habitsWhat"),
      signs: t("learn.habitsSigns"),
      help: t("learn.habitsHelp"),
    },
    {
      id: "brain",
      icon: "🧠",
      title: t("learn.brainTitle"),
      what: t("learn.brainWhat"),
      signs: t("learn.brainSigns"),
      help: t("learn.brainHelp"),
    },
    {
      id: "chemistry",
      icon: "⚗️",
      title: t("learn.chemTitle"),
      what: t("learn.chemWhat"),
      signs: t("learn.chemSigns"),
      help: t("learn.chemHelp"),
    },
    {
      id: "physical",
      icon: "💓",
      title: t("learn.physicalTitle"),
      what: t("learn.physicalWhat"),
      signs: t("learn.physicalSigns"),
      help: t("learn.physicalHelp"),
    },
    {
      id: "personality",
      icon: "🎭",
      title: t("learn.personalityTitle"),
      what: t("learn.personalityWhat"),
      signs: t("learn.personalitySigns"),
      help: t("learn.personalityHelp"),
    },
    {
      id: "habitloop",
      icon: "🔄",
      title: t("learn.habitsLoopTitle"),
      what: t("learn.habitsLoopWhat"),
      signs: t("learn.habitsLoopSigns"),
      help: t("learn.habitsLoopHelp"),
    },
  ];

  return (
    <section className="py-6 px-4">
      <div className="max-w-sm md:max-w-lg mx-auto">
        <h2 className="text-xl font-semibold text-pm-text mb-1 text-center">{t("learn.title")}</h2>
        <p className="text-sm text-pm-text-secondary mb-6 text-center">{t("learn.subtitle")}</p>

        <div className="space-y-3">
          {topics.map((topic) => (
            <div key={topic.id} className="bg-pm-surface rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === topic.id ? null : topic.id)}
                className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-pm-surface transition-all"
              >
                <span className="text-2xl">{topic.icon}</span>
                <p className="flex-1 text-sm font-semibold text-pm-text">{topic.title}</p>
                <span className="text-pm-text-muted text-sm">{expanded === topic.id ? "▲" : "▼"}</span>
              </button>
              {expanded === topic.id && (
                <div className="px-4 pb-4 space-y-3 text-xs text-pm-text-secondary leading-relaxed">
                  <p>{topic.what}</p>
                  {topic.signs && (
                    <div>
                      <p className="font-semibold text-pm-text mb-1">{t("learn.signsLabel")}</p>
                      <p>{topic.signs}</p>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-pm-text mb-1">{t("learn.helpLabel")}</p>
                    <p>{topic.help}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-pm-text-muted text-center mt-6 italic">
          {t("learn.disclaimer")}
        </p>
      </div>
    </section>
  );
}
