# Content Management System (CMS) — Database-Backed Content

## Why
- Editors and experts can update content without code deploys
- Translations managed separately from code
- Content versioning and drafts
- A/B testing different content
- Expert advisors contribute directly
- Shared content across all peacemind apps

## Database Table

```sql
create table content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  title_en text not null,
  title_zh text,
  body_en text not null,
  body_zh text,
  help_en text,
  help_zh text,
  icon text,
  author text,
  status text default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer default 0,
  app text default 'heal' check (app in ('heal', 'health', 'move', 'shared')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index content_category_idx on content (app, category, status, sort_order);
```

## Categories
- `learn` — Understand section topics (anxiety, depression, brain science)
- `tip` — Daily tips / "Did you know?" cards
- `guide` — Longer expert-written guides
- `faq` — Frequently asked questions
- `exercise` — Guided exercise descriptions (breathing, grounding)

## API Route

```
POST /api/content
  action: "list" — list published content by category/app
  action: "get" — get single piece by slug
  action: "insert" — admin/expert creates content (draft)
  action: "update" — admin/expert edits content
  action: "publish" — admin publishes draft
```

## Admin Editor Page
- `/admin/content` — list all content with status filter
- Rich text editor (markdown or simple HTML)
- Side-by-side EN/ZH editing
- Preview before publish
- Status workflow: Draft → Published → Archived

## Migration Plan

### Phase 1: Read from DB
- Create content table + API route
- Seed table with existing i18n learn content
- CalmTab LearnSection reads from API instead of i18n keys
- Fallback to i18n if API fails (offline support)

### Phase 2: Admin Editor
- Build `/admin/content` page
- Markdown editor with preview
- EN/ZH side-by-side
- Publish workflow

### Phase 3: Expert Contributions
- Expert role can create drafts
- Admin reviews and publishes
- Expert attribution on published content
- Cross-app content sharing (shared category)

### Phase 4: Dynamic Content Everywhere
- Daily tips in Peacemind Insight context
- "Did you know?" cards on mood done screen
- Move app exercise descriptions from DB
- Health app condition info from DB
