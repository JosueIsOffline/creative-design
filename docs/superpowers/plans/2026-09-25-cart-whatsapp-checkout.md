# Cart + Consolidated WhatsApp Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace each product's individual "Solicitar por WhatsApp" button with an "Agregar al carrito" flow: a persistent cart (localStorage), a header icon with item-count badge, a slide-in drawer to review/edit the order, and a checkout step with an optional personalization note that sends one consolidated WhatsApp message.

**Architecture:** A single vanilla-JS module (`src/scripts/cart.ts`) owns all cart state in `localStorage` and notifies the rest of the page via a `cart:change` custom event — the same pattern this codebase already uses for theming (`theme.ts`) and hover effects (`hover-fx.ts`), so no new state/reactivity library is introduced. `CartDrawer.astro` is a new component (same shape as the existing `ProductModal.astro`) that renders the drawer once from `BaseLayout.astro` and re-renders its contents by reading `cart.ts` on `cart:change`. The drawer's open/close motion uses GSAP `transform`/`opacity` tweens (never `left`/`right`), informed by the `apple-design` skill's guidance but deliberately scoped down: no drag-to-dismiss physics, just tap/backdrop/Escape dismiss, and a plain opacity cross-fade under `prefers-reduced-motion: reduce`.

**Tech Stack:** Astro 7 (static site, no client framework), GSAP 3.15, `astro-icon` + `@iconify-json/lucide` (new, for the cart icon) + already-installed `line-md`, Vitest 5 (Node environment, no jsdom).

**Spec:** `docs/superpowers/specs/2026-09-25-cart-whatsapp-checkout-design.md`

## Global Constraints

- No backend, no WhatsApp Business API — checkout stays a `wa.me` link with pre-filled text. It cannot attach an image automatically; that stays a manual step for the customer inside WhatsApp, and (per the approved spec) the UI doesn't even remind them to do it in this round.
- One personalization note per order, not per product.
- No swipe-to-dismiss gesture on the drawer — dismiss only via backdrop tap, the "×" button, or Escape.
- The cart persists in `localStorage` (not `sessionStorage`).
- **A cart item's identity is the pair `slug` + `productoSlug`, never `productoSlug` alone.** `src/lib/sheets.ts:114` scopes its duplicate-name counter per category (`slugKey = categoriaSlug/baseProductoSlug`), so the same `productoSlug` can legitimately exist in two different categories. Matching on `productoSlug` alone would silently merge two unrelated products into one cart line.
- No new state/reactivity dependency (Alpine, a Preact island, etc.) — vanilla JS + `localStorage`, the same pattern as `src/scripts/theme.ts` and `src/scripts/hover-fx.ts`.
- The drawer animates via GSAP `transform`/`opacity`; under `prefers-reduced-motion: reduce` it does not slide, only cross-fades opacity (no elastic/overshoot either way — this project's existing GSAP eases are all `power2`/`power3`, no bounce).

## Review Focus

- **Two products with the same `productoSlug` in different categories** must stay as two separate cart lines, not merge into one with a wrong quantity/price. Covered by a Task 1 test.
- **Corrupted or non-array JSON sitting in `localStorage.cart`** (a stale/hand-edited value, a browser extension writing garbage) must not crash the page — `getCart()` must fall back to an empty cart. Covered by a Task 1 test on the extracted `parseCartJson` helper (not exercisable via `localStorage` itself in this project's jsdom-less Vitest setup — see Task 1's note).
- **Quantity dropped to 0 (or below) via the `−` stepper** must remove the line entirely, not leave a zero-quantity row a customer could still "send". Covered by a Task 1 test.
- **The "Enviar por WhatsApp" button while the cart is empty** — structurally unreachable from the UI (the button that opens checkout only renders when the cart has items), but the send handler still guards on `cart.length === 0` defensively, in case a race ever empties the cart while checkout is open (e.g. two tabs). No automated test — noted in Task 3's own step, same defensive-code-without-a-test precedent as `ProductModal.astro`'s existing click handlers.
- **`prefers-reduced-motion: reduce`**: the drawer must not slide, only cross-fade. No automated test can assert this (no jsdom in this project, same limitation as the theming/animations plan before it) — Task 3 ends with a manual devtools check.

---

### Task 1: Cart state module (`src/scripts/cart.ts`)

**Files:**
- Create: `src/scripts/cart.ts`
- Test: `tests/cart.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export type CartItem = { slug: string; productoSlug: string; nombre: string; precio: number; foto: string; cantidad: number }`, `export function cartId(item: Pick<CartItem, 'slug' | 'productoSlug'>): string`, `export function parseCartJson(raw: string | null): CartItem[]`, `export function getCart(): CartItem[]`, `export function addItem(item: Omit<CartItem, 'cantidad'>): void`, `export function removeItem(slug: string, productoSlug: string): void`, `export function setQuantity(slug: string, productoSlug: string, cantidad: number): void`, `export function getTotal(cart?: CartItem[]): number`, `export function clearCart(): void`, `export function buildWhatsAppMessage(cart: CartItem[], nota: string): string`. Also, guarded by `typeof document !== 'undefined'`, wires a click listener on `#cart-toggle` that dispatches `cart:open`, and keeps `#cart-badge` in sync on `cart:change`. Task 2 relies on the `#cart-toggle`/`#cart-badge` ids; Task 3 imports the rest of the exports.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/cart.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCart,
  addItem,
  removeItem,
  setQuantity,
  getTotal,
  clearCart,
  buildWhatsAppMessage,
  parseCartJson,
} from '../src/scripts/cart';

const TAZA = { slug: 'tazas', productoSlug: 'taza-blanca', nombre: 'Taza Blanca', precio: 350, foto: 'https://example.com/taza.jpg' };
const VASO = { slug: 'vasos', productoSlug: 'vaso-termico', nombre: 'Vaso Térmico', precio: 650, foto: 'https://example.com/vaso.jpg' };

beforeEach(() => {
  clearCart();
});

describe('addItem', () => {
  it('adds a new product with cantidad 1', () => {
    addItem(TAZA);
    expect(getCart()).toEqual([{ ...TAZA, cantidad: 1 }]);
  });

  it('increments cantidad when the same product is added again', () => {
    addItem(TAZA);
    addItem(TAZA);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].cantidad).toBe(2);
  });

  it('keeps products with the same productoSlug in different categories as separate lines', () => {
    addItem(TAZA);
    addItem({ ...VASO, productoSlug: TAZA.productoSlug });
    expect(getCart()).toHaveLength(2);
  });
});

describe('removeItem', () => {
  it('removes only the matching slug+productoSlug pair', () => {
    addItem(TAZA);
    addItem(VASO);
    removeItem(TAZA.slug, TAZA.productoSlug);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].productoSlug).toBe(VASO.productoSlug);
  });
});

describe('setQuantity', () => {
  it('updates the quantity of the matching item', () => {
    addItem(TAZA);
    setQuantity(TAZA.slug, TAZA.productoSlug, 5);
    expect(getCart()[0].cantidad).toBe(5);
  });

  it('removes the item when the quantity drops to 0 or below', () => {
    addItem(TAZA);
    setQuantity(TAZA.slug, TAZA.productoSlug, 0);
    expect(getCart()).toHaveLength(0);
  });
});

describe('getTotal', () => {
  it('sums precio * cantidad across all items', () => {
    addItem(TAZA);
    addItem(TAZA);
    addItem(VASO);
    expect(getTotal()).toBe(350 * 2 + 650);
  });
});

describe('parseCartJson', () => {
  it('returns an empty array for null, invalid JSON, or a non-array value', () => {
    expect(parseCartJson(null)).toEqual([]);
    expect(parseCartJson('{not valid json')).toEqual([]);
    expect(parseCartJson('{"not":"an array"}')).toEqual([]);
  });

  it('returns the parsed array when it is valid', () => {
    const stored = [{ ...TAZA, cantidad: 3 }];
    expect(parseCartJson(JSON.stringify(stored))).toEqual(stored);
  });
});

describe('buildWhatsAppMessage', () => {
  it('lists each item with quantity and subtotal, and the grand total', () => {
    const cart = [
      { ...TAZA, cantidad: 2 },
      { ...VASO, cantidad: 1 },
    ];
    const message = buildWhatsAppMessage(cart, '');
    expect(message).toContain('- Taza Blanca x2 — RD$ 700');
    expect(message).toContain('- Vaso Térmico x1 — RD$ 650');
    expect(message).toContain('Total: RD$ 1,350');
  });

  it('appends the note only when it is non-empty', () => {
    const cart = [{ ...TAZA, cantidad: 1 }];
    expect(buildWhatsAppMessage(cart, '')).not.toContain('Notas:');
    expect(buildWhatsAppMessage(cart, '  ')).not.toContain('Notas:');
    expect(buildWhatsAppMessage(cart, 'Azul y blanco por favor')).toContain('Notas: Azul y blanco por favor');
  });
});
```

Note on `parseCartJson`: this project's Vitest runs in the Node environment (no jsdom — confirmed in the prior theming/animations work), so `localStorage` does not exist in tests at all, not even to seed bad data into. `parseCartJson` is deliberately extracted as a plain string-in/array-out function precisely so the "corrupted storage" case (Review Focus item 2) is still directly testable without touching `localStorage`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/cart.test.ts`
Expected: FAIL — `src/scripts/cart.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/scripts/cart.ts
export type CartItem = {
  slug: string;
  productoSlug: string;
  nombre: string;
  precio: number;
  foto: string;
  cantidad: number;
};

export function cartId(item: Pick<CartItem, 'slug' | 'productoSlug'>): string {
  return `${item.slug}/${item.productoSlug}`;
}

export function parseCartJson(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const STORAGE_KEY = 'cart';
let memoryCart: CartItem[] = [];

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function readCart(): CartItem[] {
  if (!hasLocalStorage()) return memoryCart;
  return parseCartJson(localStorage.getItem(STORAGE_KEY));
}

function writeCart(cart: CartItem[]): void {
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // storage unavailable/full — the cart just won't persist across reloads
    }
  } else {
    memoryCart = cart;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cart:change'));
  }
}

export function getCart(): CartItem[] {
  return readCart();
}

export function addItem(item: Omit<CartItem, 'cantidad'>): void {
  const cart = readCart();
  const id = cartId(item);
  const existing = cart.find((i) => cartId(i) === id);
  if (existing) {
    existing.cantidad += 1;
  } else {
    cart.push({ ...item, cantidad: 1 });
  }
  writeCart(cart);
}

export function removeItem(slug: string, productoSlug: string): void {
  const id = cartId({ slug, productoSlug });
  writeCart(readCart().filter((i) => cartId(i) !== id));
}

export function setQuantity(slug: string, productoSlug: string, cantidad: number): void {
  const id = cartId({ slug, productoSlug });
  const cart = readCart();
  if (cantidad <= 0) {
    writeCart(cart.filter((i) => cartId(i) !== id));
    return;
  }
  const item = cart.find((i) => cartId(i) === id);
  if (!item) return;
  item.cantidad = cantidad;
  writeCart(cart);
}

export function getTotal(cart: CartItem[] = readCart()): number {
  return cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

export function clearCart(): void {
  writeCart([]);
}

export function buildWhatsAppMessage(cart: CartItem[], nota: string): string {
  const lineas = cart.map(
    (item) => `- ${item.nombre} x${item.cantidad} — RD$ ${(item.precio * item.cantidad).toLocaleString('es-DO')}`
  );
  const partes = ['Hola! Quiero hacer este pedido:', '', ...lineas, '', `Total: RD$ ${getTotal(cart).toLocaleString('es-DO')}`];
  const notaLimpia = nota.trim();
  if (notaLimpia) {
    partes.push('', `Notas: ${notaLimpia}`);
  }
  return partes.join('\n');
}

if (typeof document !== 'undefined') {
  const updateBadge = () => {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = getCart().reduce((sum, item) => sum + item.cantidad, 0);
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
  };

  document.getElementById('cart-toggle')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cart:open'));
  });

  window.addEventListener('cart:change', updateBadge);
  updateBadge();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/cart.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/cart.ts tests/cart.test.ts
git commit -m "feat: add cart state module with localStorage persistence"
```

---

### Task 2: Cart icon + badge in the header

**Files:**
- Modify: `package.json` / `package-lock.json` (via `npm install`)
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: `#cart-toggle`/`#cart-badge` wiring from Task 1's `cart.ts` (imported here for its side effect).
- Produces: a `#cart-toggle` button with a `#cart-badge` span in the header, for Task 3's drawer to open in response to.

- [ ] **Step 1: Install the icon package**

Run: `npm install @iconify-json/lucide`
Expected: adds `@iconify-json/lucide` to `package.json` dependencies (`line-md` has no shopping-cart/bag icon — confirmed by inspecting its `icons.json` — so this is a new, separate icon collection for astro-icon, not a new UI framework).

- [ ] **Step 2: Add the button and wire the import**

In `src/layouts/BaseLayout.astro`, change:

```astro
        <button
          type="button"
          id="theme-toggle"
          aria-label="Cambiar entre modo claro y oscuro"
          class="w-8 h-8 rounded-full border border-border-strong flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors"
        >
          <Icon name="line-md:sunny-filled" class="theme-icon-sun w-4 h-4" aria-hidden="true" />
          <Icon name="line-md:moon-filled" class="theme-icon-moon w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </header>
```

to:

```astro
        <button
          type="button"
          id="cart-toggle"
          aria-label="Ver carrito"
          class="relative w-8 h-8 rounded-full border border-border-strong flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors"
        >
          <Icon name="lucide:shopping-cart" class="w-4 h-4" />
          <span
            id="cart-badge"
            class="hidden absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-accent text-background text-[10px] font-bold flex items-center justify-center"
          >0</span>
        </button>
        <button
          type="button"
          id="theme-toggle"
          aria-label="Cambiar entre modo claro y oscuro"
          class="w-8 h-8 rounded-full border border-border-strong flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors"
        >
          <Icon name="line-md:sunny-filled" class="theme-icon-sun w-4 h-4" aria-hidden="true" />
          <Icon name="line-md:moon-filled" class="theme-icon-moon w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </header>
```

Change:

```astro
    <script>
      import '../scripts/theme';
      import '../scripts/hover-fx';
    </script>
```

to:

```astro
    <script>
      import '../scripts/theme';
      import '../scripts/hover-fx';
      import '../scripts/cart';
    </script>
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 4: Manual check**

Run `npm run dev`, load `/`. The cart icon appears in the header with no visible badge (0 items). Open the browser console and run `localStorage.setItem('cart', JSON.stringify([{slug:'x',productoSlug:'y',nombre:'Test',precio:100,foto:'',cantidad:2}]))` then reload — the badge should now show `2`. Clicking the cart button should not error in the console yet (nothing listens for `cart:open` until Task 3).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/layouts/BaseLayout.astro
git commit -m "feat: add cart icon and badge to the header"
```

---

### Task 3: `CartDrawer.astro` — list view, checkout view, open/close animation

**Files:**
- Create: `src/components/CartDrawer.astro`
- Modify: `src/styles/global.css`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: `getCart`, `removeItem`, `setQuantity`, `getTotal`, `clearCart`, `buildWhatsAppMessage` from Task 1's `cart.ts`; listens for the `cart:open` event Task 1/2's header button dispatches, and the `cart:change` event `cart.ts` dispatches on every mutation.
- Produces: no exports; a self-contained component included once from `BaseLayout.astro`, same shape as the existing `ProductModal.astro`.

- [ ] **Step 1: Create the component**

```astro
<!-- src/components/CartDrawer.astro -->
---
import { Icon } from 'astro-icon/components';
const whatsapp = import.meta.env.WHATSAPP_NUMBER;
---
<div id="cart-backdrop" class="fixed inset-0 z-40 bg-black/80 opacity-0 pointer-events-none transition-opacity duration-300 ease-out"></div>
<aside
  id="cart-drawer"
  data-phone={whatsapp}
  class="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-surface border-l border-border flex flex-col pointer-events-none"
  aria-label="Carrito"
>
  <div class="flex items-center justify-between p-4 border-b border-border">
    <h2 class="font-display text-lg font-semibold text-foreground">Tu carrito</h2>
    <button type="button" id="cart-close" aria-label="Cerrar carrito" class="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-accent">
      <Icon name="line-md:close" class="w-4 h-4" />
    </button>
  </div>
  <div id="cart-list-view" class="flex-1 overflow-y-auto p-4"></div>
  <div id="cart-checkout-view" class="hidden flex-1 overflow-y-auto p-4 flex flex-col">
    <button type="button" id="cart-back" class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent mb-4">
      <Icon name="line-md:arrow-left" class="w-3.5 h-3.5" />
      Volver
    </button>
    <div id="cart-checkout-summary" class="text-sm text-muted mb-4"></div>
    <label for="cart-note" class="text-sm text-foreground font-medium mb-2 block">
      Cuéntanos qué colores, estilo o detalles te gustaría (opcional)
    </label>
    <textarea id="cart-note" rows="4" class="w-full rounded-xl border border-border bg-background text-foreground p-3 text-sm mb-4"></textarea>
    <button type="button" id="cart-send" class="bg-brand-lilac border border-accent text-brand-black font-medium rounded-full py-3 hover:opacity-90">
      Enviar por WhatsApp
    </button>
  </div>
</aside>

<script>
  import gsap from 'gsap';
  import { getCart, removeItem, setQuantity, getTotal, clearCart, buildWhatsAppMessage } from '../scripts/cart';

  const backdrop = document.getElementById('cart-backdrop');
  const drawer = document.getElementById('cart-drawer');
  const listView = document.getElementById('cart-list-view');
  const checkoutView = document.getElementById('cart-checkout-view');
  const checkoutSummary = document.getElementById('cart-checkout-summary');
  const noteInput = document.getElementById('cart-note') as HTMLTextAreaElement | null;
  const phone = drawer?.dataset.phone ?? '';

  let isOpen = false;

  const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function renderList() {
    if (!listView) return;
    const cart = getCart();

    if (cart.length === 0) {
      listView.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
          <p class="text-muted">Tu carrito está vacío</p>
          <a href="/catalogo" class="text-accent hover:opacity-80 text-sm font-medium">Ver catálogo</a>
        </div>
      `;
      return;
    }

    const rows = cart
      .map(
        (item) => `
          <div class="cart-item flex gap-3 py-3 border-b border-border" data-slug="${item.slug}" data-producto-slug="${item.productoSlug}">
            <img src="${item.foto}" alt="${item.nombre}" class="w-14 h-14 rounded-lg object-cover shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-foreground font-medium truncate">${item.nombre}</p>
              <p class="text-xs text-muted">RD$ ${item.precio.toLocaleString('es-DO')} c/u</p>
              <div class="flex items-center gap-2 mt-1">
                <button type="button" class="cart-qty-decrease w-6 h-6 rounded-full border border-border-strong text-muted hover:text-accent" aria-label="Quitar una unidad">−</button>
                <span class="text-sm text-foreground w-4 text-center">${item.cantidad}</span>
                <button type="button" class="cart-qty-increase w-6 h-6 rounded-full border border-border-strong text-muted hover:text-accent" aria-label="Agregar una unidad">+</button>
                <button type="button" class="cart-item-remove ml-auto text-xs text-muted hover:text-accent">Quitar</button>
              </div>
            </div>
            <p class="text-sm font-bold text-accent shrink-0">RD$ ${(item.precio * item.cantidad).toLocaleString('es-DO')}</p>
          </div>
        `
      )
      .join('');

    listView.innerHTML = `
      ${rows}
      <div class="flex items-center justify-between pt-4 font-bold text-foreground">
        <span>Total</span>
        <span>RD$ ${getTotal(cart).toLocaleString('es-DO')}</span>
      </div>
      <button type="button" id="cart-checkout-start" class="w-full mt-4 bg-brand-lilac border border-accent text-brand-black font-medium rounded-full py-3 hover:opacity-90">
        Finalizar pedido
      </button>
    `;
  }

  function showListView() {
    listView?.classList.remove('hidden');
    checkoutView?.classList.add('hidden');
  }

  function showCheckoutView() {
    const cart = getCart();
    if (checkoutSummary) {
      const rows = cart
        .map(
          (item) =>
            `<div class="flex justify-between py-1"><span>${item.nombre} x${item.cantidad}</span><span>RD$ ${(item.precio * item.cantidad).toLocaleString('es-DO')}</span></div>`
        )
        .join('');
      checkoutSummary.innerHTML = `
        ${rows}
        <div class="flex justify-between pt-2 mt-2 font-bold text-foreground border-t border-border">
          <span>Total</span>
          <span>RD$ ${getTotal(cart).toLocaleString('es-DO')}</span>
        </div>
      `;
    }
    listView?.classList.add('hidden');
    checkoutView?.classList.remove('hidden');
  }

  function openDrawer() {
    if (!drawer || !backdrop || isOpen) return;
    isOpen = true;
    renderList();
    showListView();
    drawer.classList.remove('pointer-events-none');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
    gsap.to(drawer, { opacity: 1, x: 0, duration: prefersReducedMotion() ? 0.2 : 0.35, ease: 'power3.out', overwrite: 'auto' });
  }

  function closeDrawer() {
    if (!drawer || !backdrop || !isOpen) return;
    isOpen = false;
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = '';
    gsap.to(drawer, {
      opacity: 0,
      x: prefersReducedMotion() ? 0 : '100%',
      duration: prefersReducedMotion() ? 0.2 : 0.3,
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: () => drawer.classList.add('pointer-events-none'),
    });
  }

  listView?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    if (target.closest('#cart-checkout-start')) {
      showCheckoutView();
      return;
    }

    const row = target.closest<HTMLElement>('.cart-item');
    if (!row) return;
    const slug = row.dataset.slug!;
    const productoSlug = row.dataset.productoSlug!;

    if (target.closest('.cart-qty-increase')) {
      const item = getCart().find((i) => i.slug === slug && i.productoSlug === productoSlug);
      if (item) setQuantity(slug, productoSlug, item.cantidad + 1);
    } else if (target.closest('.cart-qty-decrease')) {
      const item = getCart().find((i) => i.slug === slug && i.productoSlug === productoSlug);
      if (item) setQuantity(slug, productoSlug, item.cantidad - 1);
    } else if (target.closest('.cart-item-remove')) {
      removeItem(slug, productoSlug);
    }
  });

  document.getElementById('cart-back')?.addEventListener('click', showListView);

  document.getElementById('cart-send')?.addEventListener('click', () => {
    // Defensive guard (Review Focus): the button that reaches this view only
    // renders when the cart has items, but this stays safe if that ever changes.
    const cart = getCart();
    if (cart.length === 0) return;
    const mensaje = buildWhatsAppMessage(cart, noteInput?.value ?? '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener');
    clearCart();
    if (noteInput) noteInput.value = '';
    closeDrawer();
  });

  document.getElementById('cart-close')?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  window.addEventListener('cart:open', openDrawer);
  window.addEventListener('cart:change', renderList);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeDrawer();
  });
</script>
```

There's no meaningful pure logic here to unit test beyond what Task 1 already covers (`buildWhatsAppMessage`, `getTotal`, etc.) — this is DOM query, rendering, and event wiring, the same category as the existing untested `ProductModal.astro` client script. Verified by build + manual check below.

- [ ] **Step 2: Add the drawer's resting-state CSS**

Append to the end of `src/styles/global.css`:

```css
#cart-drawer {
  transform: translateX(100%);
  opacity: 0;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  #cart-drawer {
    transform: translateX(0);
  }
}
```

This is what makes the reduced-motion case a plain cross-fade: the drawer is always positioned at its final on-screen spot when `prefers-reduced-motion: reduce` is set, so the GSAP tween (Step 1) only ever changes its opacity, never its position, for those users.

- [ ] **Step 3: Include the component from `BaseLayout.astro`**

Change:

```astro
import '../styles/global.css';
import WhatsAppButton from '../components/WhatsAppButton.astro';
import Footer from '../components/Footer.astro';
import ProductModal from '../components/ProductModal.astro';
```

to:

```astro
import '../styles/global.css';
import WhatsAppButton from '../components/WhatsAppButton.astro';
import Footer from '../components/Footer.astro';
import ProductModal from '../components/ProductModal.astro';
import CartDrawer from '../components/CartDrawer.astro';
```

Change:

```astro
    <slot />
    <Footer />
    <WhatsAppButton />
    <ProductModal />
```

to:

```astro
    <slot />
    <Footer />
    <WhatsAppButton />
    <ProductModal />
    <CartDrawer />
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 5: Manual check**

Run `npm run dev`, load `/`. In the console, run:

```js
localStorage.setItem('cart', JSON.stringify([
  { slug: 'tazas', productoSlug: 'taza-blanca', nombre: 'Taza Blanca', precio: 350, foto: 'https://picsum.photos/100', cantidad: 2 }
]));
window.dispatchEvent(new CustomEvent('cart:change'));
```

Then click the header cart icon — the drawer should slide in from the right with the seeded item, quantity `2`, subtotal `RD$ 700`, and a total row. Test the `+`/`−` steppers, "Quitar", the backdrop click, the "×" button, and Escape — all should work and the header badge should update live. Click "Finalizar pedido" — the checkout view should show the same summary plus the note textarea. Then emulate `prefers-reduced-motion: reduce` in devtools, reload, seed the cart again, and open the drawer — it should appear instantly (cross-fade only), with no slide.

- [ ] **Step 6: Commit**

```bash
git add src/components/CartDrawer.astro src/styles/global.css src/layouts/BaseLayout.astro
git commit -m "feat: add the cart drawer with list and checkout views"
```

---

### Task 4: Wire "Agregar al carrito" into `ProductCard.astro` / `ProductModal.astro`

**Files:**
- Modify: `src/components/ProductCard.astro`
- Modify: `src/components/ProductModal.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `addItem` from Task 1's `cart.ts`.
- Produces: no exports; replaces the direct `wa.me` link on each product card with a call into the shared cart.

- [ ] **Step 1: Replace the button in `ProductCard.astro`**

Change the frontmatter:

```astro
---
import type { Product } from '../lib/sheets';
import { Icon } from 'astro-icon/components';
interface Props { product: Product }
const { product } = Astro.props;
const phone = import.meta.env.WHATSAPP_NUMBER;
const precioFormateado = `RD$ ${product.precio.toLocaleString('es-DO')}`;
const mensaje = encodeURIComponent(
  `Hola! Me interesa este producto: ${product.nombre} (${precioFormateado}). ¿Me das más información?`
);
const waHref = `https://wa.me/${phone}?text=${mensaje}`;
---
```

to:

```astro
---
import type { Product } from '../lib/sheets';
import { Icon } from 'astro-icon/components';
interface Props { product: Product }
const { product } = Astro.props;
const precioFormateado = `RD$ ${product.precio.toLocaleString('es-DO')}`;
---
```

(`phone`, `mensaje`, and `waHref` are gone — nothing here builds a `wa.me` link anymore, the drawer does that once at checkout.)

Change:

```astro
      <button
        type="button"
        class="card-whatsapp flex items-center rounded-2xl bg-brand-lilac border border-accent p-1.5 pl-6 hover:opacity-90 self-start cursor-pointer"
        data-wa-href={waHref}
      >
        <span class="text-brand-black font-medium pr-4">Solicitar por WhatsApp</span>
        <span class="js-hover-fx flex items-center justify-center w-10 h-10 rounded-full bg-brand-black text-white" aria-hidden="true">
          <Icon name="line-md:arrow-right" class="w-4 h-4" />
        </span>
      </button>
```

to:

```astro
      <button
        type="button"
        class="card-add-to-cart flex items-center rounded-2xl bg-brand-lilac border border-accent p-1.5 pl-6 hover:opacity-90 self-start cursor-pointer"
        data-product={JSON.stringify({ slug: product.slug, productoSlug: product.productoSlug, nombre: product.nombre, precio: product.precio, foto: product.fotos[0] })}
      >
        <span class="card-add-label text-brand-black font-medium pr-4">Agregar al carrito</span>
        <span class="card-add-label-added hidden text-brand-black font-medium pr-4">¡Agregado!</span>
        <span class="js-hover-fx flex items-center justify-center w-10 h-10 rounded-full bg-brand-black text-white" aria-hidden="true">
          <Icon name="line-md:arrow-right" class="w-4 h-4" />
        </span>
      </button>
```

- [ ] **Step 2: Update `ProductModal.astro`'s selectors and click handling**

Change:

```ts
  document.querySelectorAll<HTMLElement>('.card-whatsapp').forEach((el) => {
```

to:

```ts
  document.querySelectorAll<HTMLElement>('.card-add-to-cart').forEach((el) => {
```

Change:

```ts
    return [article.querySelector<HTMLElement>('.card-whatsapp'), article.querySelector<HTMLElement>('.card-close')].filter(
```

to:

```ts
    return [article.querySelector<HTMLElement>('.card-add-to-cart'), article.querySelector<HTMLElement>('.card-close')].filter(
```

Add the import at the top of the `<script>` block:

```ts
<script>
```

to:

```ts
<script>
  import { addItem } from '../scripts/cart';
```

Change:

```ts
    const waBtn = target.closest<HTMLElement>('.card-whatsapp');
    if (waBtn) {
      e.preventDefault();
      e.stopPropagation();
      const href = waBtn.dataset.waHref;
      if (href) window.open(href, '_blank', 'noopener');
      return;
    }
```

to:

```ts
    const addBtn = target.closest<HTMLElement>('.card-add-to-cart');
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      const raw = addBtn.dataset.product;
      if (raw) {
        addItem(JSON.parse(raw));
        const label = addBtn.querySelector<HTMLElement>('.card-add-label');
        const labelAdded = addBtn.querySelector<HTMLElement>('.card-add-label-added');
        label?.classList.add('hidden');
        labelAdded?.classList.remove('hidden');
        window.setTimeout(() => {
          label?.classList.remove('hidden');
          labelAdded?.classList.add('hidden');
        }, 1200);
      }
      return;
    }
```

- [ ] **Step 3: Rename the CSS class in `global.css`**

Change all four occurrences in `src/styles/global.css`:

```css
.card-whatsapp {
```
```css
.product-card.is-expanded .card-whatsapp {
```
```css
.product-card.is-expanded .card-whatsapp.is-hiding {
```
```css
.product-card.is-expanded .card-whatsapp.is-precollapsed {
```

to:

```css
.card-add-to-cart {
```
```css
.product-card.is-expanded .card-add-to-cart {
```
```css
.product-card.is-expanded .card-add-to-cart.is-hiding {
```
```css
.product-card.is-expanded .card-add-to-cart.is-precollapsed {
```

(The `--wa-height` custom property name inside those rules stays as-is — it's an internal implementation detail, not user-facing, and renaming it is unrelated churn.)

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 5: Grep check**

Run: `grep -rn "card-whatsapp\|data-wa-href" src/`
Expected: no output — every reference was renamed or removed.

- [ ] **Step 6: Manual check**

Run `npm run dev`, go to `/catalogo`, click a product card to expand it (the existing view-transition expand should be unaffected), click "Agregar al carrito" — the label should flash "¡Agregado!" for about a second then revert, and the header badge should increment. Open the cart drawer (Task 3) and confirm the product appears with the right name/price/photo. Add the same product a second time (collapse and re-expand the card, or add from a different card of the same product on another page) and confirm its quantity goes to 2 instead of creating a second row.

- [ ] **Step 7: Commit**

```bash
git add src/components/ProductCard.astro src/components/ProductModal.astro src/styles/global.css
git commit -m "feat: replace per-product WhatsApp button with add-to-cart"
```

---

### Task 5: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (the existing suites plus `tests/cart.test.ts`'s 11 new tests).

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build completes with no errors, `dist/` produced for all pages.

- [ ] **Step 3: Grep the build output for leftovers**

Run: `grep -rl "card-whatsapp\|Solicitar por WhatsApp\|data-wa-href" dist/`
Expected: no output.

- [ ] **Step 4: Full manual walkthrough**

Run `npm run dev` and, in both light and dark mode:
- Add 2-3 different products to the cart from `/catalogo` (both from the grid and from an expanded card).
- Open the drawer, adjust quantities, remove one item, confirm the total updates every time.
- Go to checkout, type a note, click "Enviar por WhatsApp" — confirm the new tab/window opens `wa.me` with the phone number from `.env`, and the pre-filled text lists every remaining item, the total, and the note.
- Confirm the cart badge and drawer both reset to empty afterward, and that reloading the page keeps the cart empty (i.e. `clearCart()` actually persisted).
- Emulate `prefers-reduced-motion: reduce` and confirm the drawer only cross-fades, never slides.
- Resize to a narrow (phone-width) viewport and confirm the drawer still fits and its contents don't overflow horizontally.

- [ ] **Step 5: Commit (only if Step 4 required fixes)**

If the manual walkthrough surfaced no issues, there is nothing to commit for this task. If it did, fix inline, re-run Steps 1-3, then:

```bash
git add -A
git commit -m "fix: address issues found in cart/checkout verification pass"
```
