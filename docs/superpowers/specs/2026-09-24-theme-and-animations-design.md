# Dark/light mode + animaciones GSAP adicionales

## Contexto y objetivo

El sitio (catálogo Astro de Creative Design) hoy solo tiene un tema oscuro fijo, con colores hardcodeados (`bg-brand-black`, `text-white`, `border-gray-700/800`, etc.) repetidos en los ~10 componentes/páginas. El usuario quiere:

1. Soporte de dark mode y light mode, con el light mode basado en el fondo `oklch(0.96 0.0057 308.39)` provisto.
2. Más animaciones GSAP y una experiencia más "viva" en general (scroll reveals, micro-interacciones, hero más elaborado, transición de tema).

## Alcance

Cambia el sistema de color de todo el sitio (token semántico compartido por todos los componentes) y agrega animaciones GSAP en varios puntos. No cambia la arquitectura de datos, el catálogo, ni la lógica de expand/collapse del `ProductModal` (solo sus colores, no su comportamiento de view-transitions).

## Sistema de theming

### Tokens semánticos

Se reemplaza el bloque `@theme` de `src/styles/global.css` por tokens semánticos vía CSS custom properties + `@theme inline` (patrón Tailwind v4), con un valor por modo:

| Token Tailwind | CSS var | Dark (valor actual) | Light (nuevo) |
|---|---|---|---|
| `bg-background` | `--background` | `#0d0d0c` | `oklch(0.96 0.0057 308.39)` |
| `text-foreground` | `--foreground` | blanco (`#fff`) | `oklch(0.145 0 0)` |
| `bg-surface` | `--surface` | `#1a1a1a` | blanco puro |
| `border-border` | `--border` | equivalente a gray-800 actual | gris claro |
| `border-border-strong` | `--border-strong` | equivalente a gray-700 actual | gris medio |
| `text-muted` | `--muted` | equivalente a gray-300/400 actual | gris oscuro |
| `text-subtle` | `--subtle` | equivalente a gray-500 actual | gris medio-claro |
| `text-accent` / `border-accent` | `--accent` | `#d9a8d9` (igual que hoy) | lila más oscuro/saturado, con contraste AA sobre `oklch(0.96 0.0057 308.39)` |

`--color-brand-lilac` (`#d9a8d9`) se mantiene como color de marca fijo, sin variar por modo — se usa únicamente como **relleno** de botones/chips (siempre con `text-brand-black` encima), nunca como texto sobre el fondo de página.

Se eliminan `--color-brand-orange`, `--color-brand-pink`, `--color-brand-purple` del bloque `@theme`: están definidos pero no se referencian en ningún componente.

### Mecanismo de activación

- `:root` define los valores dark (son los valores actuales, quedan como base/fallback).
- `[data-theme="light"]` sobreescribe con los valores light de la tabla.
- Un script inline, bloqueante, en el `<head>` de `BaseLayout.astro` (antes de que se pinte el `<body>`) decide el tema inicial:
  1. Si existe `localStorage.theme` (`"light"` o `"dark"`), lo usa.
  2. Si no, usa `matchMedia('(prefers-color-scheme: light)')`.
  3. Aplica el resultado como `document.documentElement.dataset.theme`.
- Esto evita flash del tema incorrecto (FOUC), porque corre antes de renderizar contenido.

### Toggle

Botón nuevo en el header (`BaseLayout.astro`), junto a los íconos de Instagram/WhatsApp. Ícono sol/luna (`line-md:sunny-outline-to-moon-transition` o similar de la colección `line-md`, que ya está instalada y ya trae su propia animación). Al hacer click:

1. Si el navegador soporta `document.startViewTransition`, envuelve el cambio de `data-theme` + `localStorage.setItem('theme', ...)` en una view transition (mismo mecanismo que ya usa `ProductModal.astro` para el expand de cards, con el mismo fallback `if (document.startViewTransition)` para navegadores sin soporte).
2. Sin soporte, aplica el cambio directo sin transición.

## Migración de componentes

Reemplazo mecánico de clases (sin tocar lógica) en los archivos que usan colores hardcodeados:

| Clase actual | Nueva clase |
|---|---|
| `bg-brand-black` | `bg-background` |
| `text-white` | `text-foreground` |
| `bg-brand-surface` | `bg-surface` |
| `border-gray-800` | `border-border` |
| `border-gray-700` | `border-border-strong` |
| `text-gray-300`, `text-gray-400` | `text-muted` |
| `text-gray-500` | `text-subtle` |
| `text-brand-lilac` (headings, íconos, flechas sobre el fondo) | `text-accent` |
| `hover:text-brand-lilac`, `hover:border-brand-lilac` | `hover:text-accent`, `hover:border-accent` |
| `bg-brand-lilac` + `text-brand-black` (botones/chips) | sin cambio |

Archivos afectados: `Hero.astro`, `About.astro`, `Services.astro`, `CategoryFilter.astro`, `Footer.astro`, `ProductCard.astro`, `WhatsAppButton.astro`, `BaseLayout.astro`, `pages/index.astro`, `pages/catalogo/[categoria]/[producto].astro`.

Quedan sin cambio (fijos en ambos modos, a propósito):
- El backdrop del modal (`bg-black/80` en `ProductModal.astro`) — es un overlay, no contenido de página.
- El botón flotante de WhatsApp (verde de marca + ícono blanco) — es un botón de marca de terceros, no debe camuflarse con el tema.

## Animaciones GSAP

### Scroll reveals

Se registra `ScrollTrigger` (plugin incluido en el paquete `gsap` ya instalado, vía `import { ScrollTrigger } from 'gsap/ScrollTrigger'` + `gsap.registerPlugin(ScrollTrigger)`) en:
- Cards de `Services.astro`
- Cards de "valores" en `About.astro`
- Grid de productos (`ProductCard` dentro de `index.astro` y `catalogo/[categoria].astro`)

Fade + slide-up con stagger al entrar en viewport, una sola vez (`toggleActions: "play none none none"`).

### Micro-interacciones hover

Las flechas dentro de círculos (ProductCard, Hero, About, página de producto) y los íconos de redes del header ganan un `gsap.to()` en `mouseenter`/`mouseleave` (traslación sutil + scale), en vez de depender solo de `transition-colors` de CSS.

### Hero más elaborado

Se reemplaza el fade simple actual por un `gsap.timeline()`:
1. El SVG de las tijeras en "Cre✂tive" se dibuja con `stroke-dasharray` (mismo truco que ya usan los íconos animados `line-md`).
2. Título.
3. Chips, con stagger.
4. Subtítulo y botón CTA.

### Accesibilidad

Todas las animaciones de scroll/hover/hero van envueltas en `gsap.matchMedia()` respetando `prefers-reduced-motion` — con esa preferencia activa, el contenido aparece directo, sin animación (helper nativo de GSAP, no requiere lógica manual).

## Fuera de alcance

- No se toca la lógica de expand/collapse de `ProductModal.astro` (view transitions de la card), solo sus clases de color si las tuviera (no las tiene).
- No se agregan nuevas dependencias más allá de `ScrollTrigger`, que ya viene incluido en el paquete `gsap` instalado.
- No se añade un selector de tema "automático/sistema" visible en la UI — el toggle es binario (light/dark); "seguir sistema" es solo el comportamiento por defecto antes de la primera interacción manual.
