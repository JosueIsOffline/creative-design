import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('HeroStory (Hero as scroll storytelling, adapted from the Halo reference HeroDeck)', () => {
  it('imports all three anatomy figures via Vite raw imports and wraps the existing Hero', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain("import Hero from './Hero.astro'");
    expect(src).toContain("from '../../tools/heat-press-figure/figure.svg?raw'");
    expect(src).toContain("from '../../tools/design-figure/figure.svg?raw'");
    expect(src).toContain("from '../../tools/packaging-figure/figure.svg?raw'");
  });

  it('the three landing cards are visible from the start (not opacity-0) so the cursor peephole has something to show', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src, 'a past bug: opacity-0 on the cards made the peephole reveal nothing until scroll').not.toContain('opacity-0 scale-90');
    expect(src).toContain('landing-card absolute');
  });

  it('cuts a cursor-following peephole mask directly on the cover (not a separate overlay), sized via an animated --radius custom property', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain('[data-hero-cover] {');
    expect(src).toContain('--radius: 0');
    expect(src).toContain('mask-image: radial-gradient(');
    expect(src).toContain("gsap.to(cover, { '--radius': 160");
    expect(src).toContain("gsap.to(cover, { '--radius': 0");
  });

  it('gates the peephole to fine-pointer, hover-capable, motion-safe devices only', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain("mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'");
  });

  it("syncs the scroll-scrubbed animation to the sticky element's actual pin range, not the stage's full height", async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(
      src,
      "a past bug: end: 'bottom bottom' scrubs over the full stage height, but position:sticky only holds for (stage height - one viewport) — past that the content un-sticks independently of the animation's progress"
    ).not.toContain("end: 'bottom bottom'");
    expect(src).toContain('end: () => `+=${stage.offsetHeight - window.innerHeight}`');
  });

  it('phones/tablets get a plain stacked grid instead of the pin + peephole', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain('lg:hidden');
    expect(src).toContain('grid-cols-1 sm:grid-cols-3');
  });

  it('re-mounts safely via a per-element marker on astro:page-load', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain('dataset.heroMounted');
    expect(src).toContain("addEventListener('astro:page-load', mount)");
  });

  it('replaces the direct Hero usage on the home page, and the old standalone SublimationFigure section is gone', async () => {
    const src = await read('src/pages/index.astro');
    expect(src).toContain("import HeroStory from '../components/HeroStory.astro'");
    expect(src).toContain('<HeroStory');
    expect(src).not.toContain('SublimationFigure');
  });

  it('Hero.astro keeps a stable id for HeroStory to target from outside', async () => {
    const src = await read('src/components/Hero.astro');
    expect(src).toContain('id="hero-panel"');
  });
});

describe('design-figure and packaging-figure build scripts (geometry sources)', () => {
  it('both generate figure.svg for HeroStory to import', async () => {
    const designFiles = await fs.readdir(path.join(process.cwd(), 'tools/design-figure'));
    const packagingFiles = await fs.readdir(path.join(process.cwd(), 'tools/packaging-figure'));
    expect(designFiles).toContain('figure.svg');
    expect(designFiles).toContain('build.mjs');
    expect(packagingFiles).toContain('figure.svg');
    expect(packagingFiles).toContain('build.mjs');
  });

  it("the design figure's pen rests as a flat free line with a nib dot, not an upright cylinder (reads as a peg standing up)", async () => {
    const src = await read('tools/design-figure/build.mjs');
    expect(src, 'a bug fixed during review — the pen was an upright cylinder, reading as a peg rather than a resting pen').not.toContain(
      "k.cylinder(pen.to[0], pen.to[1]"
    );
    expect(src).toContain("tone: 'hi', free: true");
  });

  it('the packaging figure has no crossing ribbon over the open box (it visually collided with the mug sticking out of the walls)', async () => {
    const src = await read('tools/packaging-figure/build.mjs');
    expect(src, 'a bug fixed during review — the ribbon crossed at wall-top height, cutting through the taller mug').not.toContain('function ribbon()');
  });
});
