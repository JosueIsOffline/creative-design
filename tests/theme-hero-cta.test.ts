import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('Hero CTA opacity is not fought over by a competing CSS transition', () => {
  it('the [data-gsap="hero-cta"] element has no transition-opacity class', async () => {
    // GSAP's entrance timeline runs `.from('[data-gsap="hero-cta"]', { opacity: 0, ... })`,
    // writing element.style.opacity every animation frame. A CSS
    // `transition: opacity ...` declared on the SAME element (from
    // Tailwind's `transition-opacity`, added for the unrelated hover-dim
    // effect) fights those per-frame inline writes and can leave the
    // computed opacity stuck at 0 forever — reproduced live: the "Ver
    // catálogo" button was invisible in both themes with zero console
    // errors, and devtools showed opacity frozen at "0" for 6+ seconds
    // while the same tween's `transform`/y value animated and settled
    // normally (no competing transition-transform on that element).
    const src = await fs.readFile(path.join(process.cwd(), 'src/components/Hero.astro'), 'utf-8');
    const ctaLine = src.split('\n').find((line) => line.includes('data-gsap="hero-cta"') && line.includes('<a'));
    expect(ctaLine, 'could not find the hero-cta <a> element').toBeTruthy();
    expect(ctaLine, 'hero-cta still has transition-opacity, which fights GSAP\'s opacity tween').not.toContain('transition-opacity');
  });
});
