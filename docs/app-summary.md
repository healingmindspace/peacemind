# Heal — A Moment of Calm

**URL**: https://heal.peacemind.app
**Brand**: peacemind.app

## One-Liner

A free, bilingual mental wellness app that helps you track your emotions, find calm, grow through small steps, and understand yourself — powered by gentle AI.

## Mission

To make mental health support accessible, gentle, and stigma-free — helping people understand that emotions are normal, healing starts with small steps, and no one has to carry it alone.

## The Problem

- Mental health tools are often clinical, expensive, or intimidating
- People don't track their emotional patterns until it's too late
- Depression and anxiety go unrecognized because physical symptoms are overlooked
- Existing apps focus on diagnosis, not daily gentle support

## The Solution

Heal meets people where they are — whether they're having a good day or struggling. It combines mood tracking, breathing exercises, journaling, goal-setting, and validated self-assessments in one calm, beautiful interface. AI (Healer) acts as a warm companion, not a therapist — noticing patterns, offering gentle encouragement, and knowing when to suggest professional help.

## Four Tabs

### 🌈 Mood — Smart emotional check-ins
- 5 mood levels with custom trigger and coping tags
- AI detects patterns across history ("You've felt this way about work 3 times this week")
- Photo-based mood detection (AI reads photos to suggest triggers)
- Wellness nudge: when 4+ low moods detected, gently suggests self-assessment
- All mood data encrypted (AES-256-GCM)

### 🍃 Calm — Tools to find peace
- Guided breathing: Box Breathing, 4-7-8, Simple Calm
- 5-4-3-2-1 grounding exercise for anxiety
- Photo gallery with custom categories for visual relaxation
- Spotify integration for meditation music
- **Self Check-In**: Free PHQ-9 (depression) and GAD-7 (anxiety) screening — validated, public domain questionnaires with scoring, severity levels, and score history tracking
- **Understand**: Educational content on emotions, anxiety, depression, coping, supporting others, and daily habits — all bilingual

### 🌱 Grow — Small steps forward
- Growth paths (School, Work, Life, Exercise, or custom)
- AI-powered step planning (Healer suggests 3 gentle first steps)
- Smart schedule detection from natural language ("run tomorrow 9am")
- Built-in calendar scheduling with date/time picker
- Journal with AI responses, photo extraction, threaded updates
- Weekly review with per-path progress and AI encouragement
- Achieve, hide, or archive paths

### ✨ Me — Your story at a glance
- Today's stats, streaks, weekly overview
- Healer Insight: AI analysis integrating mood, journal, path progress, and assessment scores
- Read-aloud support
- About, privacy, feedback

## Key Differentiators

| Feature | Heal | Typical Apps |
|---------|------|-------------|
| Price | Free | $10-20/mo |
| AI companion | Gentle, pattern-aware | Generic chatbot or none |
| Self-assessment | PHQ-9 + GAD-7 free, no login required | Paywalled or absent |
| Depression education | Physical symptoms highlighted | Emotional only |
| Approach | "Emotions are normal" | "Fix yourself" |
| Encryption | AES-256-GCM on all personal data | Often plaintext |
| Language | Bilingual EN/ZH | English only |
| Wellness nudge | Proactive pattern detection | Reactive only |

## Tech Stack

- Next.js, TypeScript, Tailwind CSS
- Supabase (Auth + Postgres + Storage)
- Anthropic Claude Haiku (AI)
- PWA (installable on mobile)
- Vercel (hosting + CI/CD)
- AES-256-GCM server-side encryption

## Security & Privacy

- All journals, mood triggers, goals, and tasks encrypted server-side
- Row-level security on all database tables
- Server-side user ownership verification on all API routes
- Rate limiting on all endpoints
- Input validation on all routes
- No third-party analytics or tracking
- Crisis resources (US, China, International) always accessible

## Database Tables

moods, journals, breathing_sessions, goals, tasks, mood_options, assessments, spotify_playlists, feedback, visits, photos (storage)

## Target Users

- Anyone experiencing stress, anxiety, or low mood
- People curious about their emotional patterns
- Students, young professionals under pressure
- Chinese-speaking communities (full ZH support)
- People who want gentle self-help before/alongside therapy

## Vision

Expand peacemind.app into a platform with multiple wellness apps (heal, breathe, sleep, grow) — each focused on one aspect of mental health, all connected under the same gentle philosophy: the simplest things can heal.
