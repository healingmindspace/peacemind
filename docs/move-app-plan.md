# Move — Mind-Body Connection

**URL**: move.peacemind.app
**Brand**: peacemind.app

## One-Liner
A gentle exercise companion that connects physical movement to mental wellness — because moving your body heals your mind.

## Philosophy
Exercise isn't punishment. It's medicine for your nervous system. Even 5 minutes of movement can shift your brain chemistry. Move meets you where you are — whether that's a 30-minute run or just standing up and stretching.

## Core Features

### 🏃 Movement Tracking
- Log workouts: walk, run, yoga, stretch, swim, bike, strength, dance
- Duration + intensity (gentle / moderate / intense)
- How you felt before vs after (mood shift tracking)
- "Even 5 minutes counts" — no minimum, no shame

### 🧘 Mind-Body Exercises
- Guided stretching routines (morning, desk break, evening wind-down)
- Yoga flows with breathing cues (beginner-friendly)
- Walking meditation: "Notice 3 things on your walk"
- Body scan: tension awareness + release
- Post-exercise mindfulness: "How does your body feel now?"

### 📊 The Connection
- Mood before/after exercise visualization
- "On days you walked, your mood was X% better"
- Sleep quality correlation with exercise days
- Energy level trends with activity
- Integration with Heal: pull mood data, show exercise impact on mental health

### 🌱 Gentle Goals
- Weekly movement goals (not calories or miles — minutes of movement)
- Streaks that celebrate consistency, not intensity
- "Rest days matter" — rest is part of the plan
- AI coach (Healer): "You've been stressed this week. A gentle walk might help."

### 📚 Learn
- Why exercise helps depression (serotonin, endorphins, BDNF)
- Mind-body connection science
- Exercise for anxiety (what works, what doesn't)
- Starting when you have zero motivation
- Movement for chronic conditions (gentle options)

## Tab Structure
- 🏃 Today — quick log + mood before/after
- 🧘 Practice — guided mind-body exercises
- 📊 Trends — mood-movement correlation
- 🌱 Goals — weekly movement goals + streaks

## Integration with Peacemind Ecosystem
- **Heal** → mood data feeds into movement impact analysis
- **Health** → exercise data correlates with symptom tracking
- **Community** → share movement wins, join challenges

## Tech
Same stack: Next.js, Supabase, Claude Haiku, Vercel, Capacitor
Shared auth, theming system, API-first architecture

## Key Differentiator
Most exercise apps track calories and PRs. Move tracks how exercise makes you **feel**. The metric isn't performance — it's the mood shift from before to after. "I walked 10 minutes and felt 30% better" matters more than "I burned 200 calories."

## Database Tables (planned)
- activities (type, duration, intensity, mood_before, mood_after, notes)
- movement_goals (weekly_minutes_target, current_minutes)
- guided_sessions (type, completed, duration)
- daily_movement (date, total_minutes, types)
