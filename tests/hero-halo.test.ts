import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('HeroHalo (a faithful port of the Halo reference template HeroDeck, not an adaptation)', () => {
  it("headlines with the brand name \"Creative Design\", with the cursor-icon standing in for the \"a\" of \"Creative\" (Hero.astro's own trick) — not a generic tagline", async () => {
    const src = await read('src/components/HeroHalo.astro');
    expect(src).toContain('<span class="sr-only">Creative Design</span>');
    expect(src).toContain('Cre<svg viewBox="-8 0 32 32" class="panel__cursor"');
    expect(src).toContain('tive Design');
    expect(src).toContain('d="M4 12l7.07 17 2.51-7.39L21 19.07 4 12z"');
  });

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

  it("points Halo's token names at this project's own brand colors instead of Halo's violet/lime preset", async () => {
    const src = await read('src/components/HeroHalo.astro');
    expect(src).toContain('.show {');
    expect(
      src,
      "the palette must be ours (var(--color-brand-lilac) etc.), not Halo's hardcoded violet/lime hex values"
    ).not.toContain('#C6FF3D');
    expect(src).not.toContain('#7C3AED');
    expect(src).toContain('--accent: var(--color-brand-lilac)');
    expect(src).toContain('--glow: var(--color-brand-lilac)');
    expect(src).toContain('--bg: var(--background)');
    expect(src).toContain('--fg: var(--foreground)');
    const globalCss = await read('src/styles/global.css');
    expect(globalCss, "the site's own global tokens must not be touched by this port").not.toContain('#C6FF3D');
  });

  it("uses this project's own fonts (Space Grotesk, already loaded site-wide) instead of Halo's Inter Tight / JetBrains Mono", async () => {
    const src = await read('src/components/HeroHalo.astro');
    expect(src, "Inter Tight / JetBrains Mono were only needed for Halo's own fonts").not.toContain('Inter Tight');
    expect(src).not.toContain('JetBrains Mono');
    expect(src, 'a separate Google Fonts <link> is unneeded now — Space Grotesk is already loaded by global.css').not.toContain('fonts.googleapis.com');
    expect(src).toContain('--display: var(--font-display)');
    expect(src).toContain('--text: var(--font-display)');
  });

  it(
    "aliases --bg-2 and --muted through the --color-* theme names, not the bare --surface/--muted names this rule " +
      "also redeclares for Halo's own CSS (a custom property redeclared in the same rule always wins over an earlier " +
      "var() reference to the same name, so --bg-2: var(--surface) would silently resolve to Halo's own glass-surface " +
      "formula instead of our dark surface color — this is the bug that made the identity tile render white-on-white)",
    async () => {
      const src = await read('src/components/HeroHalo.astro');
      expect(src).toContain('--bg-2: var(--color-surface)');
      expect(src).toContain('--muted: var(--color-muted)');
      expect(src).not.toContain('--bg-2: var(--surface)');
      expect(src).not.toContain('--muted: var(--muted)');
    }
  );

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
