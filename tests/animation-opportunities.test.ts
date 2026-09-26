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

describe('opportunity 2: cart drawer view crossfade instead of an instant hidden-class swap', () => {
  it('CartDrawer.astro crossfades on user-triggered view switches, not on open/close reset', async () => {
    const src = await read('src/components/CartDrawer.astro');
    expect(src, 'missing the crossfade helper').toContain('function switchView(');
    expect(src, 'missing the instant reset helper').toContain('function resetToListView(');
    expect(src, 'showListView should route through the crossfade').toMatch(/function showListView\(\) \{\s*switchView\(/);
    expect(src, 'showCheckoutView should route through the crossfade').toContain('switchView(listView, checkoutView)');
    expect(src, 'openDrawer should reset instantly, not crossfade').toMatch(/renderList\(\);\s*resetToListView\(\);/);
    expect(src, 'closeDrawer should reset instantly, not crossfade').toMatch(/drawer\.inert = true;\s*resetToListView\(\);/);
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

describe('opportunity 4: CategoryFilter pills get hover feedback', () => {
  it('the inactive pill branch has a transition and hover state', async () => {
    const src = await read('src/components/CategoryFilter.astro');
    expect(src).toContain('transition-colors');
    expect(src).toContain('hover:border-accent');
  });
});
