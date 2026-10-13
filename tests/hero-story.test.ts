import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('HeroStory (Hero as scroll storytelling, ported from the Halo reference HeroDeck mechanic)', () => {
  it('imports all three anatomy figures via Vite raw imports and wraps the existing Hero', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain("import Hero from './Hero.astro'");
    expect(src).toContain("from '../../tools/heat-press-figure/figure.svg?raw'");
    expect(src).toContain("from '../../tools/design-figure/figure.svg?raw'");
    expect(src).toContain("from '../../tools/packaging-figure/figure.svg?raw'");
  });

  it('has a single card (sublimation) and two side tiles (design, packaging) laid out on a board', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain('data-card');
    expect(src).toMatch(/data-tile[^-]/);
    expect(src).toContain("const [card, ...tiles] = steps");
  });

  it('is no longer the cursor-peephole design — that mechanic is fully gone', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src, 'rejected design: a cursor-following mask over the Hero').not.toContain('--radius');
    expect(src).not.toContain('mask-image');
    expect(src).not.toContain('data-hero-cover');
    expect(src).not.toContain('pointerenter');
  });

  it("crops the Hero panel's own clip-path down toward the card's window, so the panel reads as becoming it", async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain('panel.style.clipPath');
    expect(src).toContain('panel.style.opacity');
    expect(src).toContain('card.style.transform');
  });

  it('stages the morph -> settle -> staggered tile landings on one scroll timeline, matching the HeroDeck beat order', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain('const MORPH = [0.02, 0.26]');
    expect(src).toContain('const SETTLE = [0.3, 0.46]');
    expect(src).toContain('const FIRST = 0.44');
    expect(src).toContain('const EVERY = 0.16');
  });

  it("syncs the scroll-scrubbed animation to the sticky element's actual pin range, not the stage's full height", async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(
      src,
      "a past bug: end: 'bottom bottom' scrubs over the full stage height, but position:sticky only holds for (stage height - one viewport) — past that the content un-sticks independently of the animation's progress"
    ).not.toContain("end: 'bottom bottom'");
    expect(src).toContain('end: () => `+=${stage.offsetHeight - window.innerHeight}`');
  });

  it('runs a caption rail with a fill bar that steps through card then each tile', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain('data-cap');
    expect(src).toContain('data-cap-fill');
    expect(src).toContain('data-step');
    expect(src).toContain('capSteps.forEach');
  });

  it('gates the entire pin/absolute storytelling layout behind motion-safe on desktop, so reduced motion falls back to a plain stacked flow (panel, then the finished board)', async () => {
    const src = await read('src/components/HeroStory.astro');
    expect(src).toContain('motion-safe:lg:h-[420vh]');
    expect(src).toContain('motion-safe:lg:sticky');
    expect(src).toContain('motion-safe:lg:absolute');
    expect(src).toContain('@media (prefers-reduced-motion: no-preference) and (min-width: 1024px)');
    expect(src).toContain("mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)'");
  });

  it('phones/tablets get a plain stacked grid instead of the pin + morph', async () => {
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
