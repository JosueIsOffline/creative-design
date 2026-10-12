import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('micro-interactions.ts: magnetic, tilt, lift, spot (adapted from the Halo reference)', () => {
  it('gates on fine pointer and motion-safe, and re-mounts per astro:page-load without duplicating listeners', async () => {
    const src = await read('src/scripts/micro-interactions.ts');
    expect(src).toContain("matchMedia('(hover: hover) and (pointer: fine)')");
    expect(src).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(src, 'needs a per-element marker so persisted elements are not re-wired on every navigation').toContain('dataset.microMounted');
    expect(src).toContain("addEventListener('astro:page-load', mount)");
  });

  it('exposes all four effects via data attributes', async () => {
    const src = await read('src/scripts/micro-interactions.ts');
    expect(src).toContain("wire('[data-magnetic]'");
    expect(src).toContain("wire('[data-tilt]'");
    expect(src).toContain("wire('[data-lift]'");
    expect(src).toContain("wire('[data-spot]'");
  });

  it('hover-fx.ts was fixed with the same re-mount-safe pattern (pre-existing latent bug under ClientRouter)', async () => {
    const src = await read('src/scripts/hover-fx.ts');
    expect(src).toContain('dataset.hoverFxMounted');
    expect(src).toContain("addEventListener('astro:page-load', mount)");
  });

  it('BaseLayout loads micro-interactions.ts', async () => {
    const src = await read('src/layouts/BaseLayout.astro');
    expect(src).toContain("import '../scripts/micro-interactions'");
  });
});

describe('micro-interactions are wired onto real elements', () => {
  it('Hero CTA and both add-to-cart buttons are magnetic', async () => {
    const hero = await read('src/components/Hero.astro');
    const card = await read('src/components/ProductCard.astro');
    const detail = await read('src/pages/catalogo/[categoria]/[producto].astro');
    expect(hero).toContain('data-magnetic');
    expect(card).toContain('data-magnetic');
    expect(detail).toContain('data-magnetic');
  });

  it('ProductCard image wrapper tilts and shows a pointer spotlight', async () => {
    const src = await read('src/components/ProductCard.astro');
    expect(src).toContain('data-tilt');
    expect(src).toContain('data-spot');
  });

  it('CategoryFilter tabs lift on hover', async () => {
    const src = await read('src/components/CategoryFilter.astro');
    expect(src).toContain('data-lift');
  });

  it('global.css defines the spotlight glow for [data-spot]', async () => {
    const src = await read('src/styles/global.css');
    expect(src).toContain('[data-spot]::after');
    expect(src).toContain('var(--mx, 50%) var(--my, 50%)');
  });
});
