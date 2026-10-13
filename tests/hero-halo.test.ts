import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('HeroHalo (a faithful port of the Halo reference template HeroDeck, not an adaptation)', () => {
  it('uses the same motion package and scroll-driven math as the reference, not GSAP', async () => {
    const src = await read('src/components/HeroHalo.astro');
    expect(src).toContain("import { animate, scroll, stagger } from 'motion'");
    expect(src).not.toContain('gsap');
    expect(src).toContain('const MORPH = [0.02, 0.24], SETTLE = [0.28, 0.42], FIRST = 0.4, EVERY = 0.12, LAND = 0.14');
    expect(src).toContain('const PEEK = [{ x: -0.5, y: -0.2, r: -10 }, { x: 0.52, y: 0.16, r: 9 }]');
  });

  it('ports the panel/card morph, tick-based easing toward scroll target, and pointer depth verbatim', async () => {
    const src = await read('src/components/HeroHalo.astro');
    expect(src).toContain("panel.style.clipPath = `inset(");
    expect(src).toContain('now += (target - now) * 0.14');
    expect(src).toContain("scroll((p: number) => { target = p; wake(); }, { target: root, offset: ['start start', 'end end'] })");
    expect(src).toContain('root.addEventListener(\'pointermove\'');
  });

  it('scopes the Halo "halo" preset tokens to .show instead of touching the site-wide tokens in global.css', async () => {
    const src = await read('src/components/HeroHalo.astro');
    expect(src).toContain('.show {');
    expect(src).toContain('--accent: #C6FF3D');
    expect(src).toContain('--glow: #7C3AED');
    const globalCss = await read('src/styles/global.css');
    expect(globalCss, "the site's own global tokens must not be touched by this port").not.toContain('#C6FF3D');
  });

  it('gates the pinned/absolute scene behind the .js marker and reduced motion, matching the reference exactly', async () => {
    const src = await read('src/components/HeroHalo.astro');
    expect(src).toContain('@media (prefers-reduced-motion: no-preference) {');
    expect(src).toContain(':global(.js) .show { height: 460svh;');
    const layout = await read('src/layouts/BaseLayout.astro');
    expect(
      layout,
      "HeroHalo's CSS is gated behind :global(.js) .show — without this marker, no-JS visitors would get the pinned/absolute layout with the key and tiles stuck at opacity:0 forever"
    ).toContain("document.documentElement.classList.add('js')");
  });

  it('replaces Halo\'s own Button/Media/content-model components with this project\'s own Icon and a real screenshot, not invented stock photography', async () => {
    const src = await read('src/components/HeroHalo.astro');
    expect(src).not.toContain("from '../ui/Button.astro'");
    expect(src).not.toContain("from '../ui/Media.astro'");
    expect(src).not.toContain("from '../../content/site'");
    expect(src).not.toContain("from '../../content/copy'");
    expect(src).toContain("import { Icon } from 'astro-icon/components'");
    expect(src).toContain("import catalogoPreview from '../assets/hero/catalogo-preview.jpg'");
  });

  it('fills the key and two on-photo tiles with this project\'s own anatomy figures, and reuses the real WhatsApp number', async () => {
    const src = await read('src/components/HeroHalo.astro');
    expect(src).toContain("from '../../tools/heat-press-figure/figure.svg?raw'");
    expect(src).toContain("from '../../tools/design-figure/figure.svg?raw'");
    expect(src).toContain("from '../../tools/packaging-figure/figure.svg?raw'");
    expect(src).toContain('import.meta.env.WHATSAPP_NUMBER');
  });

  it('is the one wired into the home page; HeroStory.astro stays in the codebase on hold', async () => {
    const indexSrc = await read('src/pages/index.astro');
    expect(indexSrc).toContain("import HeroHalo from '../components/HeroHalo.astro'");
    expect(indexSrc).toContain('<HeroHalo');
    await expect(fs.access(path.join(process.cwd(), 'src/components/HeroStory.astro'))).resolves.toBeUndefined();
  });
});
