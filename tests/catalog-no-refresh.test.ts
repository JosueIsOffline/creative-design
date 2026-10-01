import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('catalog category switching uses client-side navigation (no full refresh)', () => {
  it('BaseLayout enables the Astro ClientRouter', async () => {
    const src = await read('src/layouts/BaseLayout.astro');
    expect(src).toContain("import { ClientRouter } from 'astro:transitions'");
    expect(src).toContain('<ClientRouter />');
  });

  it('persistent chrome (header, footer, WhatsApp button, product modal) survives client-side navigation', async () => {
    const src = await read('src/layouts/BaseLayout.astro');
    expect(src, 'header must persist so its listeners (cart, theme, mobile menu) stay wired').toMatch(/<header transition:persist/);
    expect(src).toContain('<Footer transition:persist />');
    expect(src).toContain('<WhatsAppButton transition:persist />');
    expect(src).toContain('<ProductModal transition:persist />');
  });

  it('CategoryFilter has a single morphing active-tab indicator instead of a static border per tab', async () => {
    const src = await read('src/components/CategoryFilter.astro');
    expect(src, 'the indicator should carry a transition:name so Astro morphs it between pages').toContain('transition:name="category-indicator"');
  });

  it('scroll-reveal.ts re-runs its setup on astro:page-load, not just once at module load', async () => {
    const src = await read('src/scripts/scroll-reveal.ts');
    expect(src, 'should revert the previous matchMedia context before rebuilding it').toContain('mm?.revert()');
    expect(src, 'should listen for every client-side navigation, not just the first load').toContain("addEventListener('astro:page-load', setup)");
  });
});
