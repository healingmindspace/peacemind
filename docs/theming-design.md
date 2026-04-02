# Theming Design — Shared CSS Across Apps

## Principle
All peacemind apps (Heal, Health, future apps) share the same component structure but different color palettes. Colors must NEVER be hardcoded hex values in components — always use CSS custom properties via Tailwind theme tokens.

## Color Token System

### Semantic Tokens (used in components)
```
--pm-brand          — Primary brand color (buttons, active states)
--pm-brand-hover    — Brand hover state
--pm-brand-light    — Light brand (tags, badges)
--pm-brand-bg       — Very light brand background (cards, sections)
--pm-text           — Primary text
--pm-text-secondary — Secondary text
--pm-text-muted     — Muted/disabled text
--pm-surface        — Card/surface background (white/60)
--pm-surface-hover  — Surface hover state
--pm-border         — Border color
--pm-accent         — Accent background (highlight sections)
```

### Heal Palette (purple)
```css
:root {
  --pm-brand: #7c6a9e;
  --pm-brand-hover: #6b5b8a;
  --pm-brand-light: #c4b5e0;
  --pm-brand-bg: #f0e6f6;
  --pm-text: #3d3155;
  --pm-text-secondary: #5a4a7a;
  --pm-text-muted: #b0a3c4;
  --pm-text-tertiary: #8a7da0;
  --pm-surface: rgba(255, 255, 255, 0.5);
  --pm-surface-hover: rgba(255, 255, 255, 0.8);
  --pm-border: #d8cfe8;
  --pm-accent: #e8dff0;
}
```

### Health Palette (green)
```css
:root {
  --pm-brand: #4a7a4a;
  --pm-brand-hover: #3d6a3d;
  --pm-brand-light: #a0c8a0;
  --pm-brand-bg: #e8f0e6;
  --pm-text: #2d4a2d;
  --pm-text-secondary: #3d5a3d;
  --pm-text-muted: #a0b8a0;
  --pm-text-tertiary: #6a8a6a;
  --pm-surface: rgba(255, 255, 255, 0.5);
  --pm-surface-hover: rgba(255, 255, 255, 0.8);
  --pm-border: #c0d8c0;
  --pm-accent: #d0e8d0;
}
```

## Tailwind Config
```js
// Extend Tailwind to use CSS custom properties
colors: {
  brand: {
    DEFAULT: 'var(--pm-brand)',
    hover: 'var(--pm-brand-hover)',
    light: 'var(--pm-brand-light)',
    bg: 'var(--pm-brand-bg)',
  },
  pm: {
    text: 'var(--pm-text)',
    'text-secondary': 'var(--pm-text-secondary)',
    'text-muted': 'var(--pm-text-muted)',
    'text-tertiary': 'var(--pm-text-tertiary)',
    surface: 'var(--pm-surface)',
    'surface-hover': 'var(--pm-surface-hover)',
    border: 'var(--pm-border)',
    accent: 'var(--pm-accent)',
  },
}
```

## Component Usage
```tsx
// ❌ Before (hardcoded)
className="bg-[#7c6a9e] text-white hover:bg-[#6b5b8a]"
className="text-[#3d3155]"
className="bg-white/60 text-[#5a4a7a]"
className="border border-[#d8cfe8]"

// ✅ After (themed)
className="bg-brand text-white hover:bg-brand-hover"
className="text-pm-text"
className="bg-pm-surface text-pm-text-secondary"
className="border border-pm-border"
```

## Migration Map
| Hardcoded | Token | Usage |
|-----------|-------|-------|
| `#7c6a9e` | `brand` | Primary buttons, active tabs, checkboxes |
| `#6b5b8a` | `brand-hover` | Button hover states |
| `#c4b5e0` | `brand-light` | Progress bars, secondary accents |
| `#f0e6f6` | `brand-bg` | Light background sections |
| `#3d3155` | `pm-text` | Primary text, headings |
| `#5a4a7a` | `pm-text-secondary` | Body text, descriptions |
| `#8a7da0` | `pm-text-tertiary` | Timestamps, hints |
| `#b0a3c4` | `pm-text-muted` | Disabled text, placeholders |
| `#6b5b8a` | `pm-text-secondary` | Some secondary text (same as hover) |
| `white/60`, `white/50` | `pm-surface` | Card backgrounds |
| `white/80` | `pm-surface-hover` | Card hover states |
| `#d8cfe8` | `pm-border` | Input borders, dividers |
| `#e8dff0` | `pm-accent` | Tag backgrounds, subtle highlights |

## Rules
1. NEVER use hardcoded hex colors in components
2. Always use the token classes: `text-pm-text`, `bg-brand`, etc.
3. If a new color is needed, add it as a token — don't hardcode
4. Each app only changes globals.css `:root` values
5. Components are identical across apps
