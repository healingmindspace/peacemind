# API-First Architecture — Design Principles

## Goal
One codebase that serves web (Vercel), iOS (Capacitor), and Android (Capacitor) — all through the same API backend.

## Core Principles

### 1. All data flows through API routes
- No direct Supabase calls from client components (except auth)
- Every read, write, delete goes through `/api/*`
- Server-side validates ownership, encrypts data, enforces rate limits
- Client is a pure UI layer — it renders data and calls APIs

### 2. Auth lives in a centralized context
- Single `AuthProvider` wraps the app
- Provides `user`, `accessToken`, `loading` state
- Components consume auth via `useAuth()` hook — never call `supabase.auth` directly
- Token refresh handled in one place
- Works identically on web and Capacitor

### 3. Storage goes through API routes
- `POST /api/photos` — upload file (server stores in Supabase Storage)
- `GET /api/photos/[path]` — returns signed URL
- `DELETE /api/photos/[path]` — removes file
- Client never imports Supabase storage SDK

### 4. Platform-agnostic client
- No `window.location` assumptions (use router)
- No `localStorage` for critical data (use DB) — localStorage OK for caches
- OAuth flows work on both web and Capacitor (deep links for mobile)
- Safe-area CSS for mobile notches

## Current State (what needs to change)

### Auth (partially centralized)
**Now**: Every component calls `supabase.auth.getSession()` before API calls
**Target**: Single `AuthProvider` with `useAuth()` hook that provides `accessToken`

Files to update:
- GoalsTab.tsx — getSession() calls
- MoodTracker.tsx — getSession() calls
- GratitudeJournal.tsx — getSession() calls
- SpotifyPlayer.tsx — getSession() calls
- BreathingExercise.tsx — getSession() calls
- GroundingExercise.tsx — getSession() calls
- HeroSection.tsx — getSession() calls
- SelfAssessment.tsx — getSession() calls
- SummaryTab.tsx — getSession() calls
- DailySummary.tsx — getSession() calls

### Storage (direct Supabase calls)
**Now**: Components call `supabase.storage.from("photos").upload/createSignedUrl/remove`
**Target**: API routes handle all storage operations

Files to update:
- MoodTracker.tsx — upload, signedUrl, remove
- GratitudeJournal.tsx — upload, signedUrl, remove
- journal/JournalHistory.tsx — remove

### API routes (already good)
All 15+ API routes already follow API-first:
- Server-side auth verification (`getAuthenticatedUserId`)
- Server-side encryption/decryption
- Rate limiting
- Input validation
- User ownership checks

## Migration Plan

### Phase 1: Auth Context
1. Create `lib/auth-context.tsx` with `AuthProvider` and `useAuth()`
2. Provides: `user`, `accessToken`, `loading`, `signIn()`, `signOut()`
3. Listens to `onAuthStateChange` in one place
4. Wrap app in `AuthProvider`
5. Replace all `supabase.auth.getSession()` calls with `useAuth()`

### Phase 2: Storage API Routes
1. Create `/api/photos` route (upload, signedUrl, delete)
2. Update MoodTracker to use API for photo operations
3. Update GratitudeJournal to use API for photo operations
4. Update JournalHistory to use API for photo delete
5. Remove `supabase.storage` imports from all components

### Phase 3: Remove Supabase Client from Components
1. After Phase 1+2, components should not import `createClient`
2. Only `lib/auth-context.tsx` creates the Supabase client
3. Components only use `useAuth()` + `fetch("/api/...")`

### Phase 4: Capacitor Setup
1. Install Capacitor in heal-app
2. Add iOS platform
3. Configure deep links for OAuth callback
4. Build static export or point to live URL
5. Test in Xcode simulator
6. Submit to App Store

## API Route Inventory

| Route | Purpose | Auth | Rate Limit |
|-------|---------|------|------------|
| /api/mood | Mood CRUD (encrypted) | Yes | 100/hr |
| /api/mood-respond | Mood AI response | No* | 20/hr |
| /api/mood-options | Custom trigger/helped tags | Yes | 100/hr |
| /api/journal | Journal CRUD (encrypted) | Yes | 100/hr |
| /api/respond | Journal AI response | No* | 20/hr |
| /api/goals | Goals CRUD (encrypted) | Yes | 100/hr |
| /api/tasks | Tasks CRUD (encrypted) | Yes | 100/hr |
| /api/goal-review | Weekly review AI | Yes | 5/hr |
| /api/plan-path | AI step planning | No* | 10/hr |
| /api/daily-summary | Healer Insight AI | No* | 10/hr |
| /api/daily-comfort | Daily comfort AI | Optional | 10/hr |
| /api/breathing | Breathing sessions | Yes | 100/hr |
| /api/assessments | PHQ-9/GAD-7 scores | Yes | 100/hr |
| /api/spotify-history | Spotify playlist history | Yes | 100/hr |
| /api/feedback-check | Unread feedback count | Yes | 100/hr |
| /api/extract-photo | Photo → journal text AI | No* | 20/hr |
| /api/extract-mood-photo | Photo → mood trigger AI | No* | 20/hr |
| /api/visit | Anonymous visit tracking | No | 100/hr |
| /api/gcal-token | Google Calendar OAuth | No | 20/hr |

*No auth required but rate limited by IP

## File Structure (target)

```
lib/
  auth-context.tsx    — AuthProvider, useAuth()
  supabase.ts         — Supabase client (used only by auth-context)
  api-utils.ts        — Server-side: getSupabase, getAuthenticatedUserId
  server-encrypt.ts   — Server-side: AES-256 encrypt/decrypt
  rate-limit.ts       — Server-side: rate limiting
  i18n.tsx            — Client-side: translations

app/
  api/                — All backend logic
  components/         — Pure UI, only uses useAuth() + fetch()
  page.tsx            — App shell with AuthProvider
```
