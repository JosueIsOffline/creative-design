# Dark/Light Theme + GSAP Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dark/light theme toggle (defaulting to system preference) to the Astro catalog site, and layer in GSAP scroll reveals, hover micro-interactions, a theme-switch crossfade, and a more elaborate Hero entrance — without touching the existing product-card expand/collapse logic.

**Architecture:** Tailwind v4 semantic color tokens (`--background`, `--foreground`, `--surface`, `--border`, `--border-strong`, `--muted`, `--subtle`, `--accent`) defined once in `global.css`, switched by a `data-theme` attribute on `<html>` set by a tiny blocking inline script (no FOUC) and flipped by a toggle button using `document.startViewTransition` for a smooth crossfade. All ~10 components/pages get their hardcoded Tailwind gray/white/black classes swapped for the semantic ones. GSAP work reuses the `ScrollTrigger` plugin already bundled with the installed `gsap` package; `gsap.matchMedia()` gates every new animation behind `prefers-reduced-motion: no-preference`.

**Tech Stack:** Astro 7 (static site, no client framework), Tailwind CSS v4 (`@theme inline`), GSAP 3.15 (+ `ScrollTrigger`), `astro-icon` + `@iconify-json/line-md` (already installed), Vitest 5 (Node environment, no jsdom).

**Spec:** `docs/superpowers/specs/2026-09-24-theme-and-animations-design.md`

## Global Constraints

- Dark mode must stay pixel-identical to today's look — every dark-mode token reuses today's exact literal value (or Tailwind's own generated gray custom property), never a hand-guessed replacement.
- No new npm dependencies. `ScrollTrigger` ships inside the already-installed `gsap` package (`gsap/ScrollTrigger`); nothing else is needed.
- Every new animation (scroll reveal, hover, hero timeline) must be wrapped in `gsap.matchMedia()` gated on `(prefers-reduced-motion: no-preference)` so it never plays for users who asked for reduced motion.
- Theme default: `localStorage.theme` if present, else `matchMedia('(prefers-color-scheme: light)')`. A manual toggle click always overrides and persists to `localStorage`.
- Brand-fixed elements never change with the theme: the `ProductModal` backdrop (`bg-black/80`), the floating `WhatsAppButton` (green + white), and the small black-circle icon chip that sits inside every `bg-brand-lilac` pill/button (Hero CTA, `ProductCard`'s WhatsApp button, the product-detail page's WhatsApp button) and `ProductCard`'s `card-close` overlay button. These keep their literal `bg-brand-black`/`text-white`/`bg-green-500` classes — do not migrate them to semantic tokens.
- `text-gray-300` and `text-gray-400` both collapse into the single `text-muted` token (an intentional simplification already approved in the spec) — do not try to preserve the 300-vs-400 distinction.

## Review Focus

- **`prefers-reduced-motion: reduce`**: scroll reveals, hover effects, and the Hero timeline must not run — content must render fully visible with no animation. No automated test can assert this (no jsdom in this project); Tasks 5, 6, and 7 each end with a manual devtools check (emulate the media feature, reload, confirm content is visible and static).
- **`localStorage` throwing or unavailable** (e.g. Safari private browsing historically threw on `setItem`): the FOUC-prevention script and the toggle handler must not crash the page. Guarded with `try/catch` in Task 2 and Task 3.
- **No `document.startViewTransition` support** (Firefox, older Safari): the toggle must still switch the theme instantly via the plain fallback branch — covered by Task 2's implementation and Task 3's manual check.
- **Toggle button accessibility**: the sun/moon icons are `aria-hidden`; the button itself carries a static, descriptive `aria-label` so screen-reader users get an announcement even though the icon swap is purely visual — set in Task 3.
- **Leftover legacy color classes after the mechanical migration** (Task 4): a stray `bg-brand-black`/`text-white`/`border-gray-800` etc. left in one file would look fine in dark mode and break in light mode, silently. Covered by the grep-based Vitest test in Task 4, which scans every touched file for the forbidden classes.

---

### Task 1: Semantic color tokens in `global.css`

**Files:**
- Modify: `src/styles/global.css:1-13`
- Test: `tests/theme-tokens.test.ts`

**Interfaces:**
- Produces: Tailwind utility classes `bg-background`, `text-foreground`, `bg-surface`, `border-border`, `border-border-strong`, `text-muted`, `text-subtle`, `text-accent`/`border-accent`, plus the existing `bg-brand-black`, `text-brand-black`, `bg-brand-lilac` (unchanged, still available). CSS vars `--background`, `--foreground`, `--surface`, `--border`, `--border-strong`, `--muted`, `--subtle`, `--accent`, switched by `:root[data-theme="light"]`. Later tasks rely on these exact class names.

- [ ] **Step 1: Write the failing test**

```ts
// tests/theme-tokens.test.ts
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const CSS_PATH = path.join(process.cwd(), 'src', 'styles', 'global.css');

describe('theme tokens in global.css', () => {
  it('defines the semantic color tokens Tailwind needs', async () => {
    const css = await fs.readFile(CSS_PATH, 'utf-8');
    for (const token of [
      '--color-background: var(--background)',
      '--color-foreground: var(--foreground)',
      '--color-surface: var(--surface)',
      '--color-border: var(--border)',
      '--color-border-strong: var(--border-strong)',
      '--color-muted: var(--muted)',
      '--color-subtle: var(--subtle)',
      '--color-accent: var(--accent)',
    ]) {
      expect(css).toContain(token);
    }
  });

  it('defines a light override keyed on data-theme', async () => {
    const css = await fs.readFile(CSS_PATH, 'utf-8');
    expect(css).toContain(':root[data-theme="light"]');
    expect(css).toContain('oklch(0.96 0.0057 308.39)');
  });

  it('keeps the dark tokens pinned to today\'s literal brand values', async () => {
    const css = await fs.readFile(CSS_PATH, 'utf-8');
    expect(css).toContain('--background: #0d0d0c');
    expect(css).toContain('--surface: #1a1a1a');
  });

  it('keeps the fixed brand-black/brand-lilac fill colors available', async () => {
    const css = await fs.readFile(CSS_PATH, 'utf-8');
    expect(css).toContain('--color-brand-black: #0d0d0c');
    expect(css).toContain('--color-brand-lilac: #d9a8d9');
  });

  it('removes the unused brand-orange/pink/purple tokens', async () => {
    const css = await fs.readFile(CSS_PATH, 'utf-8');
    expect(css).not.toContain('brand-orange');
    expect(css).not.toContain('brand-pink');
    expect(css).not.toContain('brand-purple');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme-tokens.test.ts`
Expected: FAIL (current `global.css` has none of these tokens).

- [ ] **Step 3: Replace the `@theme` block**

Replace `src/styles/global.css:1-13` (everything from the top of the file through the closing `}` of the current `@theme` block) with:

```css
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Dancing+Script:wght@500;600&display=swap");
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-muted: var(--muted);
  --color-subtle: var(--subtle);
  --color-accent: var(--accent);
  --color-brand-black: #0d0d0c;
  --color-brand-lilac: #d9a8d9;
  --font-display: "Space Grotesk", sans-serif;
  --font-script: "Dancing Script", cursive;
}

:root {
  --background: #0d0d0c;
  --foreground: #ffffff;
  --surface: #1a1a1a;
  --border: var(--color-gray-800);
  --border-strong: var(--color-gray-700);
  --muted: var(--color-gray-400);
  --subtle: var(--color-gray-500);
  --accent: #d9a8d9;
}

:root[data-theme="light"] {
  --background: oklch(0.96 0.0057 308.39);
  --foreground: oklch(0.145 0 0);
  --surface: oklch(1 0 0);
  --border: oklch(0.88 0.012 308);
  --border-strong: oklch(0.78 0.02 308);
  --muted: oklch(0.42 0.01 308);
  --subtle: oklch(0.55 0.01 308);
  --accent: oklch(0.5 0.17 322);
}

/* Toggle button: only the icon matching the CURRENT theme is shown. */
[data-theme="dark"] .theme-icon-sun,
[data-theme="light"] .theme-icon-moon {
  display: none;
}
```

`--border`/`--border-strong`/`--muted`/`--subtle` reference Tailwind v4's own generated `--color-gray-*` variables (available automatically from `@import "tailwindcss"`) instead of hand-copied hex, so dark mode stays pixel-identical to today by construction.

Leave everything below (the `::view-transition-group(...)`, `.product-card.is-expanded`, etc. rules) untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme-tokens.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: build completes with no errors (same "Fila descartada..." catalog warnings as before are fine and unrelated).

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css tests/theme-tokens.test.ts
git commit -m "feat: add semantic dark/light color tokens"
```

---

### Task 2: Theme resolution logic (`src/scripts/theme.ts`)

**Files:**
- Create: `src/scripts/theme.ts`
- Test: `tests/theme.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export type Theme = 'light' | 'dark'` and `export function resolveTheme(stored: string | null, prefersLight: boolean): Theme`, a pure function with no DOM access (importable from Vitest's Node environment). Also, guarded by `typeof document !== 'undefined'`, wires a click listener on `#theme-toggle` (added to the DOM in Task 3) that flips `document.documentElement.dataset.theme`, persists to `localStorage.theme`, and wraps the flip in `document.startViewTransition` when available. Task 3 imports this module for its side effect (`import '../scripts/theme'`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/theme.test.ts
import { describe, it, expect } from 'vitest';
import { resolveTheme } from '../src/scripts/theme';

describe('resolveTheme', () => {
  it('uses the stored preference when it is a valid theme', () => {
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', true)).toBe('dark');
  });

  it('falls back to the system preference when nothing is stored', () => {
    expect(resolveTheme(null, true)).toBe('light');
    expect(resolveTheme(null, false)).toBe('dark');
  });

  it('falls back to the system preference when the stored value is invalid', () => {
    expect(resolveTheme('sepia', true)).toBe('light');
    expect(resolveTheme('', false)).toBe('dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme.test.ts`
Expected: FAIL — `src/scripts/theme.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/scripts/theme.ts
export type Theme = 'light' | 'dark';

export function resolveTheme(stored: string | null, prefersLight: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersLight ? 'light' : 'dark';
}

if (typeof document !== 'undefined') {
  const applyTheme = (theme: Theme) => {
    document.documentElement.dataset.theme = theme;
  };

  const currentTheme = (): Theme =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

  const setTheme = (theme: Theme) => {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // localStorage can throw in restrictive private-browsing modes —
      // the theme still applies for this page view, it just won't persist.
    }

    if (document.startViewTransition) {
      document.startViewTransition(() => applyTheme(theme));
    } else {
      applyTheme(theme);
    }
  };

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    setTheme(currentTheme() === 'light' ? 'dark' : 'light');
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/theme.ts tests/theme.test.ts
git commit -m "feat: add theme resolution and toggle logic"
```

---

### Task 3: Wire theming into `BaseLayout.astro`

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (full file, 52 lines)

**Interfaces:**
- Consumes: `resolveTheme` logic from Task 2 (duplicated inline for the blocking FOUC script — see note below), `src/scripts/theme.ts` (imported for its click-listener side effect), semantic classes from Task 1.
- Produces: a `#theme-toggle` button in the header that Task 2's script binds to; `data-theme` set on `<html>` before first paint.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `src/layouts/BaseLayout.astro` with:

```astro
---
import '../styles/global.css';
import WhatsAppButton from '../components/WhatsAppButton.astro';
import Footer from '../components/Footer.astro';
import ProductModal from '../components/ProductModal.astro';
import { Icon } from 'astro-icon/components';
interface Props {
  title: string;
  description?: string;
}
const { title, description = 'Diseño gráfico y sublimación: artículos personalizados hechos con amor, por Ailyn Japa.' } = Astro.props;
const instagram = import.meta.env.INSTAGRAM_URL;
const whatsapp = import.meta.env.WHATSAPP_NUMBER;
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <script is:inline>
      (function () {
        try {
          var stored = localStorage.getItem('theme');
          var theme = stored === 'light' || stored === 'dark'
            ? stored
            : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
          document.documentElement.dataset.theme = theme;
        } catch {
          document.documentElement.dataset.theme = 'dark';
        }
      })();
    </script>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="/logo.jpg" />
    <link rel="icon" href="/logo.jpg" type="image/jpeg" />
    <title>{title}</title>
  </head>
  <body class="bg-background text-foreground font-display">
    <header class="sticky top-0 z-40 flex items-center justify-between gap-4 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
      <a href="/" class="flex items-center gap-2 text-foreground shrink-0">
        <img src="/logo.jpg" alt="Creative Design" class="h-8 w-8 rounded-full" />
        <span class="font-semibold">Creative Design</span>
      </a>
      <nav class="hidden sm:flex items-center gap-6 text-sm text-muted" aria-label="Principal">
        <a href="/catalogo" class="hover:text-accent transition-colors">Catálogo</a>
        <a href="/#sobre-la-marca" class="hover:text-accent transition-colors">Nosotros</a>
      </nav>
      <div class="flex items-center gap-3 shrink-0">
        <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="js-hover-fx w-8 h-8 rounded-full border border-border-strong flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors">
          <Icon name="simple-icons:instagram" class="w-4 h-4" />
        </a>
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="js-hover-fx w-8 h-8 rounded-full border border-border-strong flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors">
          <Icon name="simple-icons:whatsapp" class="w-4 h-4" />
        </a>
        <button
          type="button"
          id="theme-toggle"
          aria-label="Cambiar entre modo claro y oscuro"
          class="w-8 h-8 rounded-full border border-border-strong flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors"
        >
          <Icon name="line-md:sunny-filled-loop" class="theme-icon-sun w-4 h-4" aria-hidden="true" />
          <Icon name="line-md:moon-filled-loop" class="theme-icon-moon w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </header>
    <slot />
    <Footer />
    <WhatsAppButton />
    <ProductModal />
    <script>
      import '../scripts/theme';
    </script>
  </body>
</html>
```

Notes on this diff vs. the previous file:
- `bg-brand-black`/`text-white` → `bg-background`/`text-foreground` (body); `bg-brand-black/80` → `bg-background/80`, `border-gray-800` → `border-border` (header).
- `text-gray-300` → `text-muted`, `hover:text-brand-lilac` → `hover:text-accent` (nav links).
- `border-gray-700`/`text-gray-300`/`hover:text-brand-lilac`/`hover:border-brand-lilac` → `border-border-strong`/`text-muted`/`hover:text-accent`/`hover:border-accent` on both social links (the `hover:scale-110 transition-all` added in an earlier session is removed here — Task 6 replaces it with a GSAP hover effect via the new `js-hover-fx` class, and running both at once would fight over the element's `transform`).
- New: the blocking `is:inline` script right after `<meta charset>` (must stay first, must stay `is:inline` — a regular `<script>` is deferred as a module and would paint the wrong theme for a frame).
- New: `#theme-toggle` button with two `line-md` looping icons, shown/hidden by the CSS rule added in Task 1.
- New: `<script>import '../scripts/theme';</script>` before `</body>` (Task 6 will add a second import line here).

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 3: Manual FOUC/fallback check**

Run: `npm run dev`, open the site in a browser.
1. Open devtools → Rendering tab → emulate `prefers-color-scheme: light` → reload. Page should load already in light mode, no dark flash.
2. Click the theme toggle. Colors should crossfade (Chrome/Edge) or switch instantly (Firefox/Safari) — either way, no console error.
3. In devtools console run `localStorage.getItem('theme')` — should reflect your last manual toggle, and reloading should keep that choice regardless of the OS setting.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: wire dark/light theme toggle into BaseLayout"
```

---

### Task 4: Migrate remaining components/pages to semantic tokens

**Files:**
- Modify: `src/components/Hero.astro`
- Modify: `src/components/About.astro`
- Modify: `src/components/Services.astro`
- Modify: `src/components/CategoryFilter.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/components/ProductCard.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/catalogo/index.astro`
- Modify: `src/pages/catalogo/[categoria].astro`
- Modify: `src/pages/catalogo/[categoria]/[producto].astro`
- Test: `tests/theme-migration.test.ts`

**Interfaces:**
- Consumes: semantic classes from Task 1.
- Produces: no new exports; verified purely by absence of legacy classes.

- [ ] **Step 1: Write the failing test**

```ts
// tests/theme-migration.test.ts
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const FILES = [
  'src/components/Hero.astro',
  'src/components/About.astro',
  'src/components/Services.astro',
  'src/components/CategoryFilter.astro',
  'src/components/Footer.astro',
  'src/components/ProductCard.astro',
  'src/pages/index.astro',
  'src/pages/catalogo/index.astro',
  'src/pages/catalogo/[categoria].astro',
  'src/pages/catalogo/[categoria]/[producto].astro',
];

// These have zero legitimate exceptions anywhere in FILES — every
// occurrence must have been migrated to a semantic token.
const FORBIDDEN_EVERYWHERE = [
  'bg-brand-surface',
  'border-gray-800',
  'border-gray-700',
  'text-gray-300',
  'text-gray-400',
  'text-gray-500',
  'text-brand-lilac',
  'hover:text-brand-lilac',
  'hover:border-brand-lilac',
];

// Hero.astro's CTA icon chip, ProductCard.astro's card-close overlay button
// and card-whatsapp icon chip, and the product-detail page's WhatsApp icon
// chip intentionally KEEP `bg-brand-black`/`text-white` (see Global
// Constraints — brand-fixed elements). Only files with no such exception
// get checked for these two classes.
const FORBIDDEN_NO_BRAND_FIXED_EXCEPTIONS = ['bg-brand-black', 'text-white'];
const FILES_WITH_BRAND_FIXED_EXCEPTIONS = new Set([
  'src/components/Hero.astro',
  'src/components/ProductCard.astro',
  'src/pages/catalogo/[categoria]/[producto].astro',
]);

describe('theme migration: no legacy color classes remain', () => {
  for (const file of FILES) {
    it(`${file} has no legacy classes`, async () => {
      const src = await fs.readFile(path.join(process.cwd(), file), 'utf-8');
      const forbidden = FILES_WITH_BRAND_FIXED_EXCEPTIONS.has(file)
        ? FORBIDDEN_EVERYWHERE
        : [...FORBIDDEN_EVERYWHERE, ...FORBIDDEN_NO_BRAND_FIXED_EXCEPTIONS];
      for (const cls of forbidden) {
        expect(src, `${file} still contains "${cls}"`).not.toContain(cls);
      }
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme-migration.test.ts`
Expected: FAIL — all 10 files still contain legacy classes.

- [ ] **Step 3: Migrate `src/components/Hero.astro`**

In the chips loop, change:

```astro
<span class={`px-4 py-1.5 rounded-full text-sm border ${i === chips.length - 1 ? 'bg-brand-lilac text-brand-black border-brand-lilac' : 'border-gray-700 text-gray-300'}`}>
```

to:

```astro
<span data-gsap="hero-chip" class={`px-4 py-1.5 rounded-full text-sm border ${i === chips.length - 1 ? 'bg-brand-lilac text-brand-black border-brand-lilac' : 'border-border-strong text-muted'}`}>
```

(the `data-gsap="hero-chip"` attribute is for Task 7 — add it now since you're already touching this line).

Change the title:

```astro
<h1 data-gsap="hero-title" class="font-display text-6xl sm:text-8xl md:text-9xl font-bold tracking-tight text-brand-lilac leading-none">
```

to:

```astro
<h1 data-gsap="hero-title" class="font-display text-6xl sm:text-8xl md:text-9xl font-bold tracking-tight text-accent leading-none">
```

Change the divider/signature line:

```astro
<div class="mt-4 flex items-center justify-center gap-4">
  <span class="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-white"></span>
  <span class="font-script text-2xl sm:text-3xl text-white">By Ailyn Jaspa</span>
  <span class="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-white"></span>
</div>
```

to:

```astro
<div class="mt-4 flex items-center justify-center gap-4">
  <span class="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-foreground"></span>
  <span class="font-script text-2xl sm:text-3xl text-foreground">By Ailyn Jaspa</span>
  <span class="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-foreground"></span>
</div>
```

Change the subtitle:

```astro
<p data-gsap="hero-subtitle" class="mt-6 text-lg text-gray-300 max-w-xl">{frase}</p>
```

to:

```astro
<p data-gsap="hero-subtitle" class="mt-6 text-lg text-muted max-w-xl">{frase}</p>
```

The CTA button's `bg-brand-lilac`/`text-brand-black`/`bg-brand-black`/`text-white` stay unchanged (brand-fixed pill + icon chip, per Global Constraints) — do not touch that block in this task.

- [ ] **Step 4: Migrate `src/components/About.astro`**

Change:

```astro
<h2 class="font-display text-2xl font-semibold mb-4 text-brand-lilac">Sobre la marca</h2>
<p class="text-gray-300 leading-relaxed">{historia}</p>
```

to:

```astro
<h2 class="font-display text-2xl font-semibold mb-4 text-accent">Sobre la marca</h2>
<p class="text-muted leading-relaxed">{historia}</p>
```

Change:

```astro
<div class="valor-card relative rounded-2xl bg-brand-surface border border-gray-800 p-6 text-left">
  <span class="font-display text-brand-lilac text-sm">/{v.numero}</span>
  <h3 class="font-display text-xl font-bold mt-2">{v.titulo}</h3>
  <p class="text-gray-400 text-sm mt-2">{v.descripcion}</p>
  <span class="mt-4 flex items-center justify-center w-8 h-8 rounded-full border border-gray-700 text-brand-lilac">
    <Icon name="line-md:external-link" class="w-4 h-4" />
  </span>
</div>
```

to:

```astro
<div class="valor-card relative rounded-2xl bg-surface border border-border p-6 text-left">
  <span class="font-display text-accent text-sm">/{v.numero}</span>
  <h3 class="font-display text-xl font-bold mt-2">{v.titulo}</h3>
  <p class="text-muted text-sm mt-2">{v.descripcion}</p>
  <span class="js-hover-fx mt-4 flex items-center justify-center w-8 h-8 rounded-full border border-border-strong text-accent">
    <Icon name="line-md:external-link" class="w-4 h-4" />
  </span>
</div>
```

(`js-hover-fx` is for Task 6 — add it now since you're already touching this line.)

- [ ] **Step 5: Migrate `src/components/Services.astro`**

Change:

```astro
<h2 class="font-display text-2xl font-semibold text-brand-lilac">Servicios</h2>
<p class="text-gray-400 mt-2">Todo lo que Creative Design hace por ti, de la idea a la pieza final.</p>
```

to:

```astro
<h2 class="font-display text-2xl font-semibold text-accent">Servicios</h2>
<p class="text-muted mt-2">Todo lo que Creative Design hace por ti, de la idea a la pieza final.</p>
```

Change:

```astro
<div class="service-card rounded-2xl bg-brand-surface border border-gray-800 p-6 text-left">
  <span class="flex items-center justify-center w-11 h-11 rounded-full border border-gray-700 text-brand-lilac" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" set:html={icons[s.icono]} />
  </span>
  <h3 class="font-display text-lg font-bold mt-4">{s.titulo}</h3>
  <p class="text-gray-400 text-sm mt-2 leading-relaxed">{s.descripcion}</p>
</div>
```

to:

```astro
<div class="service-card rounded-2xl bg-surface border border-border p-6 text-left">
  <span class="flex items-center justify-center w-11 h-11 rounded-full border border-border-strong text-accent" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" set:html={icons[s.icono]} />
  </span>
  <h3 class="font-display text-lg font-bold mt-4">{s.titulo}</h3>
  <p class="text-muted text-sm mt-2 leading-relaxed">{s.descripcion}</p>
</div>
```

- [ ] **Step 6: Migrate `src/components/CategoryFilter.astro`**

Change:

```astro
<nav class="flex flex-wrap gap-3 p-6" aria-label="Categorías">
  <a
    href="/catalogo"
    class={`px-4 py-2 rounded-full border border-gray-700 ${active === null ? 'bg-brand-lilac text-brand-black border-brand-lilac' : 'text-gray-300'}`}
  >
    Todos
  </a>
  {categories.map((cat) => (
    <a
      href={`/catalogo/${encodeURIComponent(cat.slug)}`}
      class={`px-4 py-2 rounded-full border border-gray-700 ${active === cat.slug ? 'bg-brand-lilac text-brand-black border-brand-lilac' : 'text-gray-300'}`}
    >
      {cat.name}
    </a>
  ))}
</nav>
```

to:

```astro
<nav class="flex flex-wrap gap-3 p-6" aria-label="Categorías">
  <a
    href="/catalogo"
    class={`px-4 py-2 rounded-full border border-border-strong ${active === null ? 'bg-brand-lilac text-brand-black border-brand-lilac' : 'text-muted'}`}
  >
    Todos
  </a>
  {categories.map((cat) => (
    <a
      href={`/catalogo/${encodeURIComponent(cat.slug)}`}
      class={`px-4 py-2 rounded-full border border-border-strong ${active === cat.slug ? 'bg-brand-lilac text-brand-black border-brand-lilac' : 'text-muted'}`}
    >
      {cat.name}
    </a>
  ))}
</nav>
```

- [ ] **Step 7: Migrate `src/components/Footer.astro`**

Change:

```astro
<footer class="border-t border-gray-800 mt-16 py-10 px-6 text-center text-sm text-gray-400">
  <div class="flex justify-center gap-6 mb-4">
    <a href={instagram} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 hover:text-brand-lilac group">
      <Icon name="simple-icons:instagram" class="w-4 h-4 group-hover:scale-110 transition-transform" />
      Instagram
    </a>
    <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 hover:text-brand-lilac group">
      <Icon name="simple-icons:whatsapp" class="w-4 h-4 group-hover:scale-110 transition-transform" />
      WhatsApp
    </a>
  </div>
  <p>&copy; {currentYear}. Todos los derechos reservados.</p>
</footer>
```

to:

```astro
<footer class="border-t border-border mt-16 py-10 px-6 text-center text-sm text-muted">
  <div class="flex justify-center gap-6 mb-4">
    <a href={instagram} target="_blank" rel="noopener noreferrer" class="js-hover-fx inline-flex items-center gap-1.5 hover:text-accent">
      <Icon name="simple-icons:instagram" class="w-4 h-4" />
      Instagram
    </a>
    <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" class="js-hover-fx inline-flex items-center gap-1.5 hover:text-accent">
      <Icon name="simple-icons:whatsapp" class="w-4 h-4" />
      WhatsApp
    </a>
  </div>
  <p>&copy; {currentYear}. Todos los derechos reservados.</p>
</footer>
```

(`group`/`group-hover:scale-110` are removed here — Task 6's `js-hover-fx` GSAP effect replaces them, added now since the line is already being touched.)

- [ ] **Step 8: Migrate `src/components/ProductCard.astro`**

Change the article/header block:

```astro
<article class="product-card relative h-full flex flex-col rounded-2xl overflow-hidden bg-brand-surface border border-gray-800 group-hover:border-brand-lilac transition-colors duration-300">
```

to:

```astro
<article class="product-card relative h-full flex flex-col rounded-2xl overflow-hidden bg-surface border border-border group-hover:border-accent transition-colors duration-300">
```

(`card-close`'s `bg-brand-black/80 text-white` stays unchanged — brand-fixed overlay button.)

Change:

```astro
<span class="card-categoria text-xs text-gray-500">{product.categoria}</span>
<h3 class="card-title font-display font-semibold text-lg text-white mt-1 truncate">{product.nombre}</h3>
<p class="card-desc-compact text-sm text-gray-400 line-clamp-2">{product.descripcion}</p>
<p class="card-desc-full hidden text-sm text-gray-300 leading-relaxed">{product.descripcion}</p>
<div class="mt-auto pt-3 flex items-center justify-between">
  <p class="card-precio font-bold text-brand-lilac">{precioFormateado}</p>
  <span class="card-arrow flex items-center justify-center w-8 h-8 rounded-full border border-gray-700 text-gray-300 group-hover:bg-brand-lilac group-hover:text-brand-black group-hover:border-brand-lilac transition-colors">
    <Icon name="line-md:arrow-right" class="w-4 h-4" />
  </span>
</div>
```

to:

```astro
<span class="card-categoria text-xs text-subtle">{product.categoria}</span>
<h3 class="card-title font-display font-semibold text-lg text-foreground mt-1 truncate">{product.nombre}</h3>
<p class="card-desc-compact text-sm text-muted line-clamp-2">{product.descripcion}</p>
<p class="card-desc-full hidden text-sm text-muted leading-relaxed">{product.descripcion}</p>
<div class="mt-auto pt-3 flex items-center justify-between">
  <p class="card-precio font-bold text-accent">{precioFormateado}</p>
  <span class="card-arrow js-hover-fx flex items-center justify-center w-8 h-8 rounded-full border border-border-strong text-muted group-hover:bg-brand-lilac group-hover:text-brand-black group-hover:border-brand-lilac transition-colors">
    <Icon name="line-md:arrow-right" class="w-4 h-4" />
  </span>
</div>
```

The `card-whatsapp` button's `bg-brand-lilac`/`text-brand-black`/`bg-brand-black`/`text-white` stay unchanged (brand-fixed pill + icon chip) — but add the hover marker to its icon chip:

```astro
<span class="flex items-center justify-center w-10 h-10 rounded-full bg-brand-black text-white" aria-hidden="true">
  <Icon name="line-md:arrow-right" class="w-4 h-4" />
</span>
```

to:

```astro
<span class="js-hover-fx flex items-center justify-center w-10 h-10 rounded-full bg-brand-black text-white" aria-hidden="true">
  <Icon name="line-md:arrow-right" class="w-4 h-4" />
</span>
```

- [ ] **Step 9: Migrate `src/pages/index.astro`**

Change:

```astro
<h2 class="font-display text-2xl font-semibold text-brand-lilac">Destacados</h2>
<a href="/catalogo" class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-lilac transition-colors">
  Ver catálogo completo
  <Icon name="line-md:arrow-right" class="w-3.5 h-3.5" />
</a>
```

to:

```astro
<h2 class="font-display text-2xl font-semibold text-accent">Destacados</h2>
<a href="/catalogo" class="js-hover-fx inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors">
  Ver catálogo completo
  <Icon name="line-md:arrow-right" class="w-3.5 h-3.5" />
</a>
```

- [ ] **Step 10: Migrate `src/pages/catalogo/index.astro` and `src/pages/catalogo/[categoria].astro`**

In both files, change:

```astro
<h1 class="text-3xl font-bold px-6 pt-6 text-brand-lilac">Catálogo</h1>
```

(and, in `[categoria].astro`, the equivalent `Catálogo - {categoryName}` line) to use `text-accent` instead of `text-brand-lilac`:

```astro
<h1 class="text-3xl font-bold px-6 pt-6 text-accent">Catálogo</h1>
```

```astro
<h1 class="text-3xl font-bold px-6 pt-6 text-accent">Catálogo - {categoryName}</h1>
```

- [ ] **Step 11: Migrate `src/pages/catalogo/[categoria]/[producto].astro`**

Change:

```astro
<a href={`/catalogo/${product.slug}`} class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-lilac transition-colors">
  <Icon name="line-md:arrow-left" class="w-3.5 h-3.5" />
  Volver a {product.categoria}
</a>
```

to:

```astro
<a href={`/catalogo/${product.slug}`} class="js-hover-fx inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors">
  <Icon name="line-md:arrow-left" class="w-3.5 h-3.5" />
  Volver a {product.categoria}
</a>
```

Change:

```astro
<img
  src={product.fotos[0]}
  alt={product.nombre}
  class="w-full aspect-square object-cover rounded-2xl border border-gray-800"
  onerror="this.onerror=null;this.src='/placeholder.jpg';"
/>
<div>
  <span class="text-xs px-3 py-1 rounded-full border border-gray-700 text-gray-400">{product.categoria}</span>
  <h1 class="font-display text-3xl sm:text-4xl font-bold mt-4 text-brand-lilac">{product.nombre}</h1>
  <p class="mt-4 text-gray-300 leading-relaxed">{product.descripcion}</p>
```

to:

```astro
<img
  src={product.fotos[0]}
  alt={product.nombre}
  class="w-full aspect-square object-cover rounded-2xl border border-border"
  onerror="this.onerror=null;this.src='/placeholder.jpg';"
/>
<div>
  <span class="text-xs px-3 py-1 rounded-full border border-border-strong text-muted">{product.categoria}</span>
  <h1 class="font-display text-3xl sm:text-4xl font-bold mt-4 text-accent">{product.nombre}</h1>
  <p class="mt-4 text-muted leading-relaxed">{product.descripcion}</p>
```

The WhatsApp button's `bg-brand-lilac`/`text-brand-black` stays unchanged; add the hover marker to its icon chip:

```astro
<span class="flex items-center justify-center w-10 h-10 rounded-full bg-brand-black text-white" aria-hidden="true">
  <Icon name="line-md:arrow-right" class="w-4 h-4" />
</span>
```

to:

```astro
<span class="js-hover-fx flex items-center justify-center w-10 h-10 rounded-full bg-brand-black text-white" aria-hidden="true">
  <Icon name="line-md:arrow-right" class="w-4 h-4" />
</span>
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run tests/theme-migration.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 13: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: all tests pass, build completes with no errors.

- [ ] **Step 14: Manual visual check**

Run `npm run dev`, click through `/`, `/catalogo`, a category page, and a product page in both themes (toggle button). Confirm no white-on-white or black-on-black text, and that hover states on links/arrows still change color.

- [ ] **Step 15: Commit**

```bash
git add src/components/Hero.astro src/components/About.astro src/components/Services.astro src/components/CategoryFilter.astro src/components/Footer.astro src/components/ProductCard.astro src/pages/index.astro src/pages/catalogo/index.astro "src/pages/catalogo/[categoria].astro" "src/pages/catalogo/[categoria]/[producto].astro" tests/theme-migration.test.ts
git commit -m "refactor: migrate components to semantic color tokens"
```

---

### Task 5: Respect `prefers-reduced-motion` in the existing scroll-reveal

**Files:**
- Modify: `src/scripts/scroll-reveal.ts` (6 lines)

**Interfaces:**
- Consumes: nothing new.
- Produces: no change to the public shape of the file (still a side-effecting module imported by `index.astro`, `catalogo/index.astro`, `catalogo/[categoria].astro`); behavior only changes for `prefers-reduced-motion: reduce` users.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `src/scripts/scroll-reveal.ts` with:

```ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  document.querySelectorAll('.product-card, .valor-card, .service-card').forEach((card) => {
    gsap.from(card, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });
});
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 3: Manual reduced-motion check**

Run `npm run dev`. In devtools Rendering tab, set "Emulate CSS media feature prefers-reduced-motion" to `reduce`, reload `/`, and scroll — service/about/product cards should be visible immediately with no fade/slide. Turn the emulation back to "no emulation" and reload — the fade/slide-in on scroll should be back.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/scroll-reveal.ts
git commit -m "feat: respect prefers-reduced-motion in scroll reveals"
```

---

### Task 6: Hover micro-interactions (`src/scripts/hover-fx.ts`)

**Files:**
- Create: `src/scripts/hover-fx.ts`
- Modify: `src/layouts/BaseLayout.astro` (add one import line — the two social `<a>` elements and their `js-hover-fx` class were already added in Task 3)

**Interfaces:**
- Consumes: `.js-hover-fx` marker class added to elements throughout Task 3 (BaseLayout's two social links) and Task 4 (About's valor-card icon circle, Footer's two links, ProductCard's arrow + WhatsApp icon chip, index.astro's "Ver catálogo completo" link, the product page's back-link + WhatsApp icon chip, Hero's CTA icon chip — added in Task 7 below).
- Produces: no exports; side-effecting module imported once from `BaseLayout.astro`.

Note: the theme-toggle button intentionally does **not** get `.js-hover-fx` — it contains two stacked `<svg>` icons (one hidden via CSS per theme), and `querySelector('svg')` would always grab the first one in DOM order regardless of which is currently visible. It already has its own continuous looping icon animation and a CSS color transition, so it doesn't need this effect too.

- [ ] **Step 1: Write the implementation**

```ts
// src/scripts/hover-fx.ts
import gsap from 'gsap';

const mm = gsap.matchMedia();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  document.querySelectorAll<HTMLElement>('.js-hover-fx').forEach((el) => {
    const target = el.querySelector<SVGElement>('svg') ?? el;
    const tl = gsap.timeline({ paused: true }).to(target, {
      scale: 1.2,
      duration: 0.25,
      ease: 'back.out(3)',
    });
    el.addEventListener('mouseenter', () => tl.play());
    el.addEventListener('mouseleave', () => tl.reverse());
  });
});
```

There's no meaningful pure logic here to unit test (it's DOM query + event wiring, same category as the existing untested `ProductModal.astro` client script) — verified by build + manual check below.

- [ ] **Step 2: Wire it up in `BaseLayout.astro`**

Change:

```astro
    <script>
      import '../scripts/theme';
    </script>
```

to:

```astro
    <script>
      import '../scripts/theme';
      import '../scripts/hover-fx';
    </script>
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 4: Manual hover check**

Run `npm run dev`. Hover the header's Instagram/WhatsApp icons, a product card's bottom-right arrow circle, the "Solicitar por WhatsApp" icon chip, the About section's arrow circles, and the product-detail page's back-link arrow. Each should scale up smoothly on hover and back down on mouse-out, with no jump/flicker. Then emulate `prefers-reduced-motion: reduce` and confirm the hover scale no longer happens.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/hover-fx.ts src/layouts/BaseLayout.astro
git commit -m "feat: add GSAP hover micro-interactions"
```

---

### Task 7: Hero entrance timeline

**Files:**
- Modify: `src/components/Hero.astro`

**Interfaces:**
- Consumes: `data-gsap="hero-chip"` (added in Task 4), plus new `data-gsap` attributes added in this task.
- Produces: no exports; replaces the two standalone `gsap.from()` calls in Hero's `<script>` block with one `gsap.timeline()`.

- [ ] **Step 1: Add `data-gsap` markers to the decorative SVG and the CTA**

In the "Cre...tive Design" decorative SVG, change:

```astro
<g transform="translate(4,4) rotate(15)">
  <rect x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill="white" />
</g>
<g transform="translate(-1,6) rotate(-40)">
  <rect x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill="#f7d842" />
</g>
<g transform="translate(-4,10) rotate(-80)">
  <rect x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill="#e85fa0" />
</g>
<g transform="translate(-3,15) rotate(-115)">
  <rect x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill="#5ec8e8" />
</g>
<path
  d="M4 12l7.07 17 2.51-7.39L21 19.07 4 12z"
  fill="white"
  stroke="white"
  stroke-width="2"
  stroke-linejoin="round"
  stroke-linecap="round"
/>
```

to:

```astro
<g transform="translate(4,4) rotate(15)">
  <rect data-gsap="hero-confetti" x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill="white" />
</g>
<g transform="translate(-1,6) rotate(-40)">
  <rect data-gsap="hero-confetti" x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill="#f7d842" />
</g>
<g transform="translate(-4,10) rotate(-80)">
  <rect data-gsap="hero-confetti" x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill="#e85fa0" />
</g>
<g transform="translate(-3,15) rotate(-115)">
  <rect data-gsap="hero-confetti" x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill="#5ec8e8" />
</g>
<path
  data-gsap="hero-shape"
  d="M4 12l7.07 17 2.51-7.39L21 19.07 4 12z"
  fill="white"
  stroke="white"
  stroke-width="2"
  stroke-linejoin="round"
  stroke-linecap="round"
/>
```

Change the CTA:

```astro
<a href="/catalogo" class="mt-8 inline-flex items-center rounded-full bg-brand-lilac p-1.5 pl-6 hover:opacity-90 transition-opacity">
```

to:

```astro
<a data-gsap="hero-cta" href="/catalogo" class="mt-8 inline-flex items-center rounded-full bg-brand-lilac p-1.5 pl-6 hover:opacity-90 transition-opacity">
```

- [ ] **Step 2: Replace the `<script>` block**

Change:

```astro
<script>
  import gsap from 'gsap';

  gsap.from('[data-gsap="hero-title"]', { opacity: 0, y: 40, duration: 1, ease: 'power3.out' });
  gsap.from('[data-gsap="hero-subtitle"]', { opacity: 0, y: 20, duration: 1, delay: 0.3, ease: 'power3.out' });
</script>
```

to:

```astro
<script>
  import gsap from 'gsap';

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline();
    const shape = document.querySelector<SVGPathElement>('[data-gsap="hero-shape"]');

    if (shape) {
      const length = shape.getTotalLength();
      gsap.set(shape, { strokeDasharray: length, strokeDashoffset: length });
      tl.to(shape, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' });
    }

    tl.from('[data-gsap="hero-confetti"]', { opacity: 0, stagger: 0.06, duration: 0.3 }, '<0.1')
      .from('[data-gsap="hero-title"]', { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' }, '-=0.2')
      .from('[data-gsap="hero-chip"]', { opacity: 0, y: 10, stagger: 0.08, duration: 0.4, ease: 'power2.out' }, '-=0.4')
      .from('[data-gsap="hero-subtitle"]', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.2')
      .from('[data-gsap="hero-cta"]', { opacity: 0, y: 10, duration: 0.5, ease: 'power3.out' }, '-=0.3');
  });
</script>
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 4: Manual check**

Run `npm run dev`, load `/`. The decorative shape should draw itself in, then the confetti rects fade in, then the title, then the chips stagger in one by one, then the subtitle and CTA. Reload a few times to make sure it's consistent. Then emulate `prefers-reduced-motion: reduce` and reload — the Hero should show fully formed immediately, no animation.

- [ ] **Step 5: Commit**

```bash
git add src/components/Hero.astro
git commit -m "feat: choreograph Hero entrance with a GSAP timeline"
```

---

### Task 8: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (existing `sheets.test.ts` + the three new test files from this plan).

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build completes with no errors, `dist/` produced for all pages.

- [ ] **Step 3: Full manual walkthrough**

Run `npm run dev` and, in both light and dark mode (toggle button), visit: `/`, `/catalogo`, a category page, a product detail page. Confirm:
- No FOUC on load or reload in either theme.
- No leftover white-on-white / black-on-black text anywhere.
- Scroll reveals, hover effects, and the Hero timeline all play in normal mode and are fully disabled under `prefers-reduced-motion: reduce`.
- The floating WhatsApp button, the product-card expand/collapse (view transitions), and the modal backdrop still behave exactly as before this plan.

- [ ] **Step 4: Commit (only if Step 3 required fixes)**

If the manual walkthrough surfaced no issues, there is nothing to commit for this task. If it did, fix inline, re-run Steps 1-3, then:

```bash
git add -A
git commit -m "fix: address issues found in theme/animation verification pass"
```
