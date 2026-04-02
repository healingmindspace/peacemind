# Peacemind Forum — Community Threads

## Vision
A safe, gentle community space where peacemind users can share experiences, support each other, and discuss mental health and wellness topics. Accessible from all peacemind apps (Heal, Health, future apps).

## URL
community.peacemind.app (or forum.peacemind.app)

## Core Principles
- **Safe space** — no judgment, gentle moderation
- **Anonymous option** — users can post without revealing identity
- **Not a replacement for professional help** — crisis resources always visible
- **Cross-app** — shared auth across all peacemind apps (same Supabase project or shared auth)

## Features

### Phase 1: Basic Threads
- Categories: Mental Health, Anxiety, Depression, Coping, Women's Health, Chronic Conditions, General
- Create thread (title + body)
- Reply to thread
- Like/heart replies
- Anonymous posting option
- Report button
- Pin important threads (admin)

### Phase 2: Community Features
- User profiles (optional display name, avatar)
- Follow threads (get notified of new replies)
- Search threads
- Tags/labels on threads
- "Me too" button (like but for relating to someone's experience)
- Weekly prompts: "What helped you this week?" / "What are you grateful for?"

### Phase 3: Integration
- Share mood insight to forum (anonymized): "I've been feeling better this week"
- Share assessment results (optional): "My PHQ-9 went from 14 to 8"
- AI-powered content moderation (flag concerning content, auto-link crisis resources)
- Connect with Heal/Health apps via shared auth

## Tech Options

### Option A: Build from scratch (same stack)
- Next.js + Supabase (same as Heal/Health)
- New tables: threads, replies, likes, reports
- Pros: full control, same infrastructure, shared auth
- Cons: more work, need moderation tools

### Option B: Embed existing platform
- Discord server (free, built-in moderation)
- Or use something like Discourse (open source forum)
- Pros: faster to launch, built-in features
- Cons: separate auth, less brand control

### Recommended: Option A
Build it ourselves — keeps the gentle peacemind brand, shared auth, and full control over the experience. The forum is simple (threads + replies) and fits our stack.

## Database Tables (if self-built)
```
threads (id, user_id, display_name, anonymous, category, title, body, pinned, created_at)
replies (id, thread_id, user_id, display_name, anonymous, body, created_at)
thread_likes (id, thread_id, user_id, created_at)
reply_likes (id, reply_id, user_id, created_at)
reports (id, target_type, target_id, user_id, reason, created_at)
```

## Moderation
- Community guidelines displayed on first visit
- Report button on every post
- Admin dashboard for reviewing reports
- Auto-flag posts with concerning keywords → surface crisis resources
- Admin can delete posts, ban users, pin threads

## Safety
- Crisis resources banner at top of forum
- AI moderation: detect self-harm language → auto-reply with resources + flag for admin
- No DMs in Phase 1 (prevents abuse)
- Anonymous posts can't be traced back (privacy)
