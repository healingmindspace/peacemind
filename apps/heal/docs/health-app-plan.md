# Health — Your Body, Understood

**URL**: health.peacemind.app
**Brand**: peacemind.app

## One-Liner

A free, bilingual health companion for chronic conditions — track symptoms, spot patterns, and understand your body with gentle AI.

## Core Conditions (Phase 1)

### 🩸 Diabetes Management
- Blood sugar logging (manual, CGM sync later)
- Meal tracking with glycemic impact notes
- A1C trend estimation
- Medication/insulin reminders
- Pattern detection: "Your sugar spikes after lunch on weekdays"

### 🛡️ Immune & Autoimmune
- Symptom tracking (flares, fatigue, pain levels)
- Trigger identification (food, stress, weather, sleep)
- Medication/supplement logging
- Flare timeline visualization
- AI pattern detection across symptoms

### 🌸 Women's Health
- Perimenopause/menopause symptom tracking (hot flashes, mood, sleep, brain fog, joint pain)
- Cycle tracking (irregular periods common in perimenopause)
- Hormone therapy logging
- Symptom severity over time
- "What helped" tracking
- Educational content: what's happening to your body and why

## Shared Features
- Daily check-in (quick symptom + energy + pain level)
- Medication/supplement reminders
- AI insights: pattern detection across symptoms, triggers, and what helped
- Doctor visit prep: generate summary of recent symptoms
- Encrypted health data (AES-256-GCM)
- Bilingual EN/ZH
- Connect with Heal for mental health correlation

## Tech Stack
Same as Heal: Next.js, TypeScript, Tailwind CSS, Supabase, Claude Haiku, Vercel, PWA

## Differentiators
- Not a medical device — a tracking companion
- Gentle, not clinical — same warm tone as Heal
- Cross-condition — one app for multiple chronic issues
- Doctor-ready exports
- Free and bilingual

## Supabase Tables (planned)
- daily_checkins (energy, pain, sleep quality, notes)
- symptoms (type, severity, duration, triggers)
- blood_sugar (value, meal_context, time)
- medications (name, dose, frequency, reminders)
- cycles (start_date, flow, symptoms)
- conditions (user's active conditions)

## Tab Structure
- 📊 Today — daily check-in + quick stats
- 🩸 Track — condition-specific logging
- 💊 Meds — medication/supplement management
- 📋 Insights — AI patterns + doctor visit prep
