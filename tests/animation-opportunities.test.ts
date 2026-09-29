import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('opportunity 1: add-to-cart press feedback', () => {
  it('global.css has a subtle :active scale for .card-add-to-cart', async () => {
    const css = await read('src/styles/global.css');
    expect(css).toContain('.card-add-to-cart:active');
    expect(css).toContain('scale(0.97)');
  });
});

describe('opportunity 2: cart page view crossfade instead of an instant hidden-class swap', () => {
  it('carrito.astro crossfades on user-triggered view switches (Finalizar pedido / Volver)', async () => {
    // The cart moved from a slide-in drawer to a dedicated /carrito page
    // (the user didn't want "everything about the cart" living in a
    // panel) — the crossfade between the list and checkout views is the
    // part of the old drawer that carried over unchanged.
    const src = await read('src/pages/carrito.astro');
    expect(src, 'missing the crossfade helper').toContain('function switchView(');
    expect(src, 'showListView should route through the crossfade').toMatch(/function showListView\(\) \{\s*switchView\(/);
    expect(src, 'showCheckoutView should route through the crossfade').toContain('switchView(listView, checkoutView)');
  });
});

describe('opportunity 3: cart stepper/remove button press feedback', () => {
  it('global.css has a subtle :active scale for the quantity and remove buttons', async () => {
    const css = await read('src/styles/global.css');
    expect(css).toContain('.cart-qty-increase:active');
    expect(css).toContain('.cart-qty-decrease:active');
    expect(css).toContain('.cart-item-remove:active');
    expect(css).toContain('scale(0.95)');
  });
});

describe('opportunity 4: CategoryFilter tabs get hover feedback', () => {
  it('the inactive tab branch has a transition and hover state', async () => {
    // Was pill buttons with hover:border-accent; redesigned as underline
    // tabs (Apple Store pass) — hover is intentionally a neutral
    // border-border-strong now, keeping border-accent reserved for the
    // active tab so the two states stay visually distinct.
    const src = await read('src/components/CategoryFilter.astro');
    expect(src).toContain('transition-colors');
    expect(src).toContain('hover:border-border-strong');
  });
});
