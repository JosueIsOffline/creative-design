import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('kinetic word reveal', () => {
  it('Hero subtitle animates split words instead of the whole paragraph', async () => {
    const src = await read('src/components/Hero.astro');
    expect(src).toContain("import { splitWords } from '../scripts/split-text'");
    expect(src).toContain('splitWords(subtitleEl)');
    expect(src, 'should no longer animate the whole subtitle element directly').not.toContain(
      '.from(\'[data-gsap="hero-subtitle"]\''
    );
  });

  it('Services and About headings are marked for the scroll-triggered word reveal', async () => {
    const services = await read('src/components/Services.astro');
    const about = await read('src/components/About.astro');
    expect(services).toContain('data-gsap="kinetic-heading"');
    expect(about).toContain('data-gsap="kinetic-heading"');
  });

  it('scroll-reveal.ts splits and reveals [data-gsap="kinetic-heading"] elements', async () => {
    const src = await read('src/scripts/scroll-reveal.ts');
    expect(src).toContain("import { splitWords } from './split-text'");
    expect(src).toContain('[data-gsap="kinetic-heading"]');
  });
});

describe('Services scroll-pin storytelling', () => {
  it('is excluded from the generic per-card fade (scroll-reveal.ts), so it is not double-animated', async () => {
    const src = await read('src/scripts/scroll-reveal.ts');
    // A comment mentioning .service-card (explaining the exclusion) is
    // fine; the actual querySelectorAll selector must not include it.
    expect(src).toContain("querySelectorAll('.product-card, .valor-card')");
  });

  it('Services.astro pins the section and scrubs the card reveal, desktop + motion-safe only', async () => {
    const src = await read('src/components/Services.astro');
    expect(src).toContain('pin: true');
    expect(src).toContain('scrub:');
    expect(src, 'should gate on a desktop-width media query').toContain('min-width: 1024px');
    expect(src, 'should still respect reduced motion').toContain('prefers-reduced-motion: no-preference');
  });

  it('Services tells a per-service scroll story with image panels that crossfade (not a flat card grid)', async () => {
    const src = await read('src/components/Services.astro');
    expect(src, 'each service needs its own representative image').toContain('imagen:');
    expect(src).toContain('service-panel-image');
    expect(src, 'panels are stacked and crossfaded via absolute positioning').toContain("position: 'absolute'");
    expect(src, 'the image should subtly scale as its panel becomes active').toContain('scale: 1');
  });
});
