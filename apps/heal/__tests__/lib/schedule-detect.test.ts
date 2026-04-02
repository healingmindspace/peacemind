import { describe, it, expect } from "vitest";

// Extract the detection logic into a testable function
function detectSchedule(title: string) {
  const lower = title.toLowerCase();
  const result: {
    scheduleType?: "once" | "habit" | "gentle";
    habitFreq?: string;
    date?: string; // YYYY-MM-DD
    time?: string; // HH:MM
    duration?: string;
  } = {};

  // Detect habit patterns
  if (/\b(every\s*day|daily|每天|每日)\b/.test(lower)) {
    result.scheduleType = "habit";
    result.habitFreq = "daily";
  } else if (/\b(weekdays?|工作日)\b/.test(lower)) {
    result.scheduleType = "habit";
    result.habitFreq = "weekdays";
  } else if (/\b(every\s*week|weekly|每周)\b/.test(lower)) {
    result.scheduleType = "habit";
    result.habitFreq = "weekly";
  }

  // Detect day names
  const dayPatterns: [RegExp, number][] = [
    [/\b(sunday|sun)\b/, 0], [/\b(monday|mon)\b/, 1], [/\b(tuesday|tue|tues)\b/, 2],
    [/\b(wednesday|wed)\b/, 3], [/\b(thursday|thu|thur|thurs)\b/, 4],
    [/\b(friday|fri)\b/, 5], [/\b(saturday|sat)\b/, 6],
  ];
  for (const [pattern, dayNum] of dayPatterns) {
    if (pattern.test(lower)) {
      result.scheduleType = "once";
      const now = new Date();
      const diff = (dayNum - now.getDay() + 7) % 7 || 7;
      const target = new Date(now);
      target.setDate(now.getDate() + diff);
      result.date = target.toISOString().split("T")[0];
      break;
    }
  }

  // Detect today/tomorrow
  if (/\b(today|今天)\b/.test(lower)) {
    result.scheduleType = "once";
    result.date = new Date().toISOString().split("T")[0];
  } else if (/\b(tomorrow|明天)\b/.test(lower)) {
    result.scheduleType = "once";
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    result.date = tom.toISOString().split("T")[0];
  }

  // Detect time
  const timeMatch = lower.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/) || lower.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    const m = timeMatch[2] && !timeMatch[2].match(/am|pm/) ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3] || (timeMatch[2]?.match(/am|pm/) ? timeMatch[2] : null);
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    result.time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Detect duration
  const durMatch = lower.match(/(\d+)\s*min/);
  if (durMatch) result.duration = durMatch[1];

  return result;
}

describe("schedule detection", () => {
  describe("habit detection", () => {
    it("detects 'daily'", () => {
      const r = detectSchedule("practice piano daily");
      expect(r.scheduleType).toBe("habit");
      expect(r.habitFreq).toBe("daily");
    });

    it("detects 'every day'", () => {
      const r = detectSchedule("meditate every day");
      expect(r.scheduleType).toBe("habit");
      expect(r.habitFreq).toBe("daily");
    });

    it("detects 'weekdays'", () => {
      const r = detectSchedule("gym weekdays");
      expect(r.scheduleType).toBe("habit");
      expect(r.habitFreq).toBe("weekdays");
    });

    it("detects 'weekly'", () => {
      const r = detectSchedule("team meeting weekly");
      expect(r.scheduleType).toBe("habit");
      expect(r.habitFreq).toBe("weekly");
    });

    it("detects Chinese 每天", () => {
      const r = detectSchedule("练琴每天");
      expect(r.scheduleType).toBe("habit");
      expect(r.habitFreq).toBe("daily");
    });
  });

  describe("day name detection", () => {
    it("detects 'Tuesday'", () => {
      const r = detectSchedule("violin class Tuesday");
      expect(r.scheduleType).toBe("once");
      expect(r.date).toBeDefined();
      const d = new Date(r.date! + "T00:00");
      expect(d.getDay()).toBe(2); // Tuesday
    });

    it("detects 'thu'", () => {
      const r = detectSchedule("dentist thu");
      expect(r.scheduleType).toBe("once");
      const d = new Date(r.date! + "T00:00");
      expect(d.getDay()).toBe(4); // Thursday
    });

    it("does not false-match 'money' as 'mon'", () => {
      const r = detectSchedule("save money for vacation");
      expect(r.date).toBeUndefined();
    });
  });

  describe("today/tomorrow detection", () => {
    it("detects 'today'", () => {
      const r = detectSchedule("finish report today");
      expect(r.scheduleType).toBe("once");
      expect(r.date).toBe(new Date().toISOString().split("T")[0]);
    });

    it("detects 'tomorrow'", () => {
      const r = detectSchedule("call doctor tomorrow");
      expect(r.scheduleType).toBe("once");
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      expect(r.date).toBe(tom.toISOString().split("T")[0]);
    });
  });

  describe("time detection", () => {
    it("detects 5:30", () => {
      const r = detectSchedule("class at 5:30");
      expect(r.time).toBe("05:30");
    });

    it("detects 9am", () => {
      const r = detectSchedule("run 9am");
      expect(r.time).toBe("09:00");
    });

    it("detects 2pm", () => {
      const r = detectSchedule("meeting 2pm");
      expect(r.time).toBe("14:00");
    });

    it("detects 14:00", () => {
      const r = detectSchedule("call at 14:00");
      expect(r.time).toBe("14:00");
    });
  });

  describe("duration detection", () => {
    it("detects '30 min'", () => {
      const r = detectSchedule("run 30 min");
      expect(r.duration).toBe("30");
    });

    it("detects '15min'", () => {
      const r = detectSchedule("meditate 15min");
      expect(r.duration).toBe("15");
    });
  });

  describe("combined detection", () => {
    it("detects 'violin class Tuesday 5:30'", () => {
      const r = detectSchedule("violin class Tuesday 5:30");
      expect(r.scheduleType).toBe("once");
      expect(r.time).toBe("05:30");
      const d = new Date(r.date! + "T00:00");
      expect(d.getDay()).toBe(2);
    });

    it("detects 'run daily 7am 30 min'", () => {
      const r = detectSchedule("run daily 7am 30 min");
      expect(r.scheduleType).toBe("habit");
      expect(r.habitFreq).toBe("daily");
      expect(r.time).toBe("07:00");
      expect(r.duration).toBe("30");
    });

    it("detects 'yoga tomorrow 6pm'", () => {
      const r = detectSchedule("yoga tomorrow 6pm");
      expect(r.scheduleType).toBe("once");
      expect(r.time).toBe("18:00");
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      expect(r.date).toBe(tom.toISOString().split("T")[0]);
    });
  });
});
