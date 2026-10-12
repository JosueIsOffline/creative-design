import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('Marquee (adapted from the Halo reference "Trust strip")', () => {
  it('duplicates the item list for a seamless loop, and hides the duplicate under reduced motion', async () => {
    const src = await read('src/components/Marquee.astro');
    expect(src, 'items should be rendered twice for the seamless-loop illusion').toContain('{items.map((item) =>');
    expect((src.match(/\{items\.map\(\(item\) =>/g) ?? []).length).toBe(2);
    expect(src, 'reduced motion should not show a redundant doubled static row').toContain('prefers-reduced-motion: reduce');
    expect(src).toContain('[data-marquee-group]:nth-child(2)');
  });

  it('slows under the pointer instead of hard-pausing (matches "drifts... slows under the pointer")', async () => {
    const src = await read('src/components/Marquee.astro');
    expect(src).toContain("gsap.to(tween, { timeScale: 0.25");
    expect(src).toContain("gsap.to(tween, { timeScale: 1");
  });

  it('re-mounts safely across astro:page-load like the other scripts in this project', async () => {
    const src = await read('src/components/Marquee.astro');
    expect(src).toContain('dataset.marqueeMounted');
    expect(src).toContain("addEventListener('astro:page-load', mount)");
  });

  it('the home page places it between Hero and Services with real, already-established categories (not invented ones)', async () => {
    const src = await read('src/pages/index.astro');
    expect(src).toContain("import Marquee from '../components/Marquee.astro'");
    expect(src, 'items should match real Services/category names already used on the site').toContain('Sublimación');
    expect(src).toContain('Personalización');
  });
});
