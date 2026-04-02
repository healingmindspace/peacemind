# Peacemind Monorepo — Shared Code Across Apps

## Goal
One repo, multiple apps, shared components and infrastructure. Change a button style once, it updates everywhere.

## Structure

```
peacemind/
├── apps/
│   ├── heal/          — heal.peacemind.app (mental wellness)
│   ├── health/        — health.peacemind.app (chronic conditions)
│   ├── move/          — move.peacemind.app (exercise + mind-body)
│   └── community/     — community.peacemind.app (forum)
│
├── packages/
│   ├── ui/            — Shared React components
│   ├── lib/           — Shared utilities (auth, api helpers, encryption)
│   ├── theme/         — CSS tokens + Tailwind config
│   └── i18n/          — Shared translation infrastructure
│
├── turbo.json         — Turborepo config
├── package.json       — Root workspace
└── tsconfig.base.json — Shared TypeScript config
```

## packages/ui — Shared Components

Components that look the same across apps (just different colors via theme):

```
packages/ui/
├── AuthButton.tsx
├── LangSwitcher.tsx
├── CrisisResources.tsx
├── CommunityCounter.tsx
├── SelfAssessment.tsx       — PHQ-9/GAD-7 (used in Heal + Health)
├── GroundingExercise.tsx    — Used in Heal + Move
├── BreathingExercise.tsx    — Used in Heal + Move
└── index.ts                 — Re-exports all
```

Usage in apps:
```tsx
import { AuthButton, CrisisResources } from "@peacemind/ui";
```

## packages/lib — Shared Utilities

```
packages/lib/
├── auth-context.tsx    — AuthProvider + useAuth()
├── api-utils.ts        — Server-side: getSupabase, getAuthenticatedUserId
├── server-encrypt.ts   — AES-256-GCM encryption
├── rate-limit.ts       — Rate limiting
├── photos-api.ts       — Photo upload/download helpers
├── tables.ts           — Table name constants
└── index.ts
```

Usage:
```tsx
import { useAuth } from "@peacemind/lib";
import { TABLES } from "@peacemind/lib";
```

## packages/theme — Shared Theming

```
packages/theme/
├── globals.css          — Base CSS with @theme inline tokens
├── heal.css             — :root overrides for Heal (purple)
├── health.css           — :root overrides for Health (green)
├── move.css             — :root overrides for Move (blue/orange?)
├── community.css        — :root overrides for Community (warm)
└── tailwind.config.ts   — Shared Tailwind config
```

Each app's `globals.css`:
```css
@import "@peacemind/theme/globals.css";
@import "@peacemind/theme/heal.css";   /* or health.css, move.css */
```

## packages/i18n — Shared Translations

```
packages/i18n/
├── provider.tsx         — I18nProvider + useI18n()
├── shared.ts            — Translations shared across apps (auth, crisis, common)
└── index.ts
```

Each app adds its own translations:
```tsx
import { I18nProvider, mergeTranslations } from "@peacemind/i18n";
import { sharedTranslations } from "@peacemind/i18n";
import { healTranslations } from "./translations";

const translations = mergeTranslations(sharedTranslations, healTranslations);
```

## App-Specific Code

Each app keeps its own:
- `app/page.tsx` — App shell, tab layout
- `app/api/*` — API routes (app-specific data)
- `app/components/*` — App-specific components
- Translations (app-specific keys)

## Turborepo Config

```json
// turbo.json
{
  "tasks": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "persistent": true },
    "lint": {},
    "type-check": {}
  }
}
```

```json
// package.json (root)
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "turbo": "^2"
  },
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "dev:heal": "turbo dev --filter=heal",
    "dev:health": "turbo dev --filter=health"
  }
}
```

## Deployment

Each app deploys independently on Vercel:
- `apps/heal` → heal.peacemind.app
- `apps/health` → health.peacemind.app
- `apps/move` → move.peacemind.app

Vercel supports monorepos natively — set "Root Directory" per project.

## Migration Plan

### Phase 1: Set up monorepo structure
- Create `peacemind/` root with Turborepo
- Move `heal-app` into `apps/heal`
- Verify everything still builds and deploys

### Phase 2: Extract shared packages
- Move `lib/auth-context.tsx`, `lib/api-utils.ts`, etc. into `packages/lib`
- Move theme CSS into `packages/theme`
- Update imports in Heal

### Phase 3: Extract shared components
- Move AuthButton, CrisisResources, etc. into `packages/ui`
- Update imports in Heal
- Health app imports from same packages

### Phase 4: Add more apps
- `apps/health` — imports from `packages/ui` + `packages/lib`
- `apps/move` — same
- Each app only has its own unique components + API routes

## When to Do This

**Not yet.** Current state (2 apps, copy-paste) is fine. Migrate when:
- 3rd app is being built
- OR you're changing shared components frequently and tired of updating 2 places
- OR you're adding more developers who need clear package boundaries

Estimated effort: 1-2 days for Phase 1-2 (structure + extract). Then ongoing as apps grow.
