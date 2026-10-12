import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('Destacados horizontal rail (adapted from the Halo reference WorkRail)', () => {
  it('pins the section and translates the track horizontally, desktop + motion-safe only', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/pages/index.astro'), 'utf-8');
    expect(src).toContain('data-rail');
    expect(src).toContain('data-rail-track');
    expect(src).toContain('pin: true');
    expect(src, 'should gate on a desktop-width media query').toContain('min-width: 1024px');
    expect(src, 'should still respect reduced motion').toContain('prefers-reduced-motion: no-preference');
  });

  it('phones/tablets get a plain swipeable row instead of the pin', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/pages/index.astro'), 'utf-8');
    expect(src).toContain('overflow-x-auto');
    expect(src).toContain('snap-x snap-mandatory');
  });

  it('re-mounts safely via a per-element marker on astro:page-load', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/pages/index.astro'), 'utf-8');
    expect(src).toContain('dataset.railMounted');
    expect(src).toContain("addEventListener('astro:page-load', mountRail)");
  });
});
