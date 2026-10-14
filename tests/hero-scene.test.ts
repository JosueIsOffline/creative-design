import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe("HeroScene (Creative Design's own scroll-storytelling hero — started as a Halo-reference port, now its own thing)", () => {
  it('headline rises into focus on load (blurred -> sharp), inspired by hipuku.dev\'s wordmark reveal', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain("{ y: ['105%', '0%'], filter: ['blur(14px)', 'blur(0px)'] }");
  });

  it('arranges the board as an overlapping workbench, not a case-study grid — each tile spans into the key\'s area and sits above it', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain('grid-template-columns: repeat(12, 1fr); grid-template-rows: repeat(10, 1fr)');
    expect(src).toContain(':global(.js) .show .key { grid-area: 2 / 4 / 10 / 10;');
    expect(src).toContain(":global(.js) .show .tile--id { grid-area: 1 / 1 / 5 / 6; }");
    expect(
      src,
      "tiles must paint above the key where they overlap it — z-index:2 on .tile vs z-index:1 on .key"
    ).toMatch(/\.show \.key \{ grid-area: 2 \/ 4 \/ 10 \/ 10; aspect-ratio: auto; z-index: 1;/);
  });

  it('settles each piece at its own small permanent tilt instead of perfectly axis-aligned, so it reads as things left on a desk', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain('const CARD_TILT = -2');
    expect(src).toContain('const TILE_TILT = [4, -5, 6, -3]');
    expect(src).toContain('rotateZ(${rz + CARD_TILT * B}deg)');
    expect(src).toContain('rotate(${mix(i % 2 ? 7 : -7, TILE_TILT[i], T)}deg)');
  });

  it('narrates through a tag stuck on whichever piece is active (.piece-tag, shown via .is-lit), not a shared numbered rail at the bottom', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src, 'the old shared caption rail must be gone').not.toContain('cap__steps');
    expect(src).not.toContain('cap__rail');
    expect(src).not.toContain('data-step');
    expect(src).not.toContain('data-fill');
    expect(src).toContain('<p class="piece-tag" data-tag>{b.identity.tag}</p>');
    expect(src).toContain('<p class="piece-tag" data-tag>{b.sublimation.tag}</p>');
    expect(src).toContain('.is-lit .piece-tag { opacity: 1;');
  });

  it("keeps the mobile layout plain (no overlap) by overriding the desktop workbench's grid-areas back to a simple 2-column stack for small screens", async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain('@media (max-width: 809px) and (prefers-reduced-motion: no-preference) {');
    expect(src).toContain(':global(.js) .show .key { grid-area: 1 / 1 / 2 / 3;');
    expect(src).toContain(':global(.js) .show .tile--id { grid-area: 2 / 1 / 3 / 2; }');
  });

  it("headlines with the brand name \"Creative Design\" — the cursor-icon stands in for the \"a\" of \"Creative\" visually, even though the real element now lives outside the fading text (Hero.astro's own trick, adapted)", async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain('<span class="sr-only">Creative Design</span>');
    expect(src).toContain('<span data-copy>Cre</span><span class="panel__cursor-space" data-cursor-space></span><span data-copy>tive Design</span>');
    expect(src).toContain('<svg class="panel__cursor" data-cursor viewBox="-8 0 32 32"');
    expect(src).toContain('d="M4 12l7.07 17 2.51-7.39L21 19.07 4 12z"');
  });

  it('is ONE cursor for its whole life — no second/cloned cursor element appears later in the scene', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(
      src,
      'a past version of this created a separate drag-cursor div that appeared out of nowhere once the headline cursor faded — this must not come back'
    ).not.toContain('data-drag-cursor');
    expect(src).not.toContain('dragCursor');
    expect(src).not.toContain('class="drag-cursor"');
    const markupMatches = src.match(/class="panel__cursor" data-cursor/g) ?? [];
    expect(markupMatches, 'exactly one data-cursor element in the markup').toHaveLength(1);
  });

  it(
    "lives outside .panel in the DOM (a sibling of .stage, placed after it) instead of nested inside the fading " +
      "headline — a bug found in review: .panel creates its own stacking context (position:absolute + z-index:2), " +
      "which traps every descendant's paint order below .stage's z-index:3 no matter what z-index a descendant sets " +
      "on itself, so the cursor was dragging correctly (confirmed via computed transforms) but invisibly, hidden " +
      "behind the card/tiles for virtually its whole trip — it only reads as 'the cursor doing something' once it can " +
      "actually paint above them",
    async () => {
      const src = await read('src/components/HeroScene.astro');
      expect(src).toContain('.panel__cursor-space above');
      expect(src).toContain('position: fixed; top: 0; left: 0; z-index: 10;');
      // The real cursor must come after .stage's closing tag and before .cap's opening tag in the markup.
      const stageEnd = src.indexOf('</article>\n      </div>\n    </div>');
      const cursorTag = src.indexOf('<svg class="panel__cursor" data-cursor');
      const capStart = src.indexOf('<div class="cap" data-cap>');
      expect(stageEnd).toBeGreaterThan(-1);
      expect(cursorTag).toBeGreaterThan(stageEnd);
      expect(capStart).toBeGreaterThan(cursorTag);
    }
  );

  it("gives the cursor its own opacity, independent of the headline text's fade — it's not nested inside the fading spans at all any more", async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(
      src,
      "the headline h1 itself must not carry data-copy: opacity doesn't let a descendant override an ancestor's fade the way visibility does, so a cursor nested inside a fading h1 could never look fully opaque once the h1 faded"
    ).not.toContain('class="panel__title display" data-copy');
    expect(src).toContain('<span data-copy>Cre</span>');
    expect(src).toContain('<span data-copy>tive Design</span>');
  });

  it('computes cursorRest from the placeholder it left behind in the text (not from itself, since it no longer sits there) once in measure(), and sizes itself to match since it can no longer inherit the huge headline font-size for an em-based size', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain("const cursorSpace = root.querySelector<HTMLElement>('[data-cursor-space]')");
    expect(src).toContain('const r = cursorSpace.getBoundingClientRect()');
    expect(src).toContain('cursorRest = { x: r.left + r.width / 2, y: r.top + r.height / 2 }');
    expect(src).toContain("cursorIcon.style.width = `${r.width}px`; cursorIcon.style.height = `${r.height}px`;");
  });

  it('drags itself from its own spot toward the centre across the whole morph, then from the centre to the card, then out to each tile in turn — one continuous trip, not a reaction after each piece already moved', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain('const toCenter = out(seg(now, MORPH[0], MORPH[1]))');
    expect(src).toContain('px = mix(cursorRest.x, center.x, toCenter)');
    expect(src, 'the card rides B (settle progress); each tile rides its own landing T — both from the same shared centre point').toContain(
      'const travelP = atCard ? B : out(seg(now, FIRST + i * EVERY, FIRST + i * EVERY + LAND))'
    );
    expect(src).toContain('px = mix(center.x, to.x, travelP)');
    expect(
      src,
      'position:fixed with top:0;left:0 means the translate IS the viewport position — px/py go straight into the transform, not as an offset from cursorRest'
    ).toContain('cursorIcon.style.transform = `translate(${px}px, ${py}px)');
  });

  it('tones down the panel background from Halo\'s saturated violet wash to a mostly-dark gradient with a soft accent glow', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(
      src,
      "Halo's own 38%/62% glow mix read as a loud magenta panel against this brand's otherwise sparse accent use"
    ).not.toContain('color-mix(in oklab, var(--glow) 38%, var(--bg))');
    expect(src).not.toContain('color-mix(in oklab, var(--glow) 62%, var(--bg))');
    expect(src).toContain('color-mix(in oklab, var(--glow) 12%, var(--bg))');
    expect(src).toContain('color-mix(in oklab, var(--glow) 22%, var(--bg))');
  });

  it('uses the same motion package and scroll-driven math as the reference, not GSAP', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain("import { animate, scroll, stagger } from 'motion'");
    expect(src).not.toContain('gsap');
    expect(src).toContain('const MORPH = [0.02, 0.24], SETTLE = [0.28, 0.42], FIRST = 0.4, EVERY = 0.12, LAND = 0.14');
    expect(src).toContain('const PEEK = [{ x: -0.5, y: -0.2, r: -10 }, { x: 0.52, y: 0.16, r: 9 }]');
  });

  it('ports the panel/card morph, tick-based easing toward scroll target, and pointer depth verbatim', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain("panel.style.clipPath = `inset(");
    expect(src).toContain('now += (target - now) * 0.14');
    expect(src).toContain("scroll((p: number) => { target = p; wake(); }, { target: root, offset: ['start start', 'end end'] })");
    expect(src).toContain('root.addEventListener(\'pointermove\'');
  });

  it("points Halo's token names at this project's own brand colors instead of Halo's violet/lime preset", async () => {
    const src = await read('src/components/HeroScene.astro');
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
    const src = await read('src/components/HeroScene.astro');
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
      const src = await read('src/components/HeroScene.astro');
      expect(src).toContain('--bg-2: var(--color-surface)');
      expect(src).toContain('--muted: var(--color-muted)');
      expect(src).not.toContain('--bg-2: var(--surface)');
      expect(src).not.toContain('--muted: var(--muted)');
    }
  );

  it('gates the pinned/absolute scene behind the .js marker and reduced motion, matching the reference exactly', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain('@media (prefers-reduced-motion: no-preference) {');
    expect(src).toContain(':global(.js) .show { height: 460svh;');
    const layout = await read('src/layouts/BaseLayout.astro');
    expect(
      layout,
      "HeroScene's CSS is gated behind :global(.js) .show — without this marker, no-JS visitors would get the pinned/absolute layout with the key and tiles stuck at opacity:0 forever"
    ).toContain("document.documentElement.classList.add('js')");
  });

  it('replaces Halo\'s own Button/Media/content-model components with this project\'s own Icon and a real screenshot, not invented stock photography', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).not.toContain("from '../ui/Button.astro'");
    expect(src).not.toContain("from '../ui/Media.astro'");
    expect(src).not.toContain("from '../../content/site'");
    expect(src).not.toContain("from '../../content/copy'");
    expect(src).toContain("import { Icon } from 'astro-icon/components'");
    expect(src).toContain("import catalogoPreview from '../assets/hero/catalogo-preview.jpg'");
  });

  it('fills the key and two on-photo tiles with this project\'s own anatomy figures, and reuses the real WhatsApp number', async () => {
    const src = await read('src/components/HeroScene.astro');
    expect(src).toContain("from '../../tools/heat-press-figure/figure.svg?raw'");
    expect(src).toContain("from '../../tools/design-figure/figure.svg?raw'");
    expect(src).toContain("from '../../tools/packaging-figure/figure.svg?raw'");
    expect(src).toContain('import.meta.env.WHATSAPP_NUMBER');
  });

  it('is the one wired into the home page; HeroStory.astro stays in the codebase on hold', async () => {
    const indexSrc = await read('src/pages/index.astro');
    expect(indexSrc).toContain("import HeroScene from '../components/HeroScene.astro'");
    expect(indexSrc).toContain('<HeroScene');
    await expect(fs.access(path.join(process.cwd(), 'src/components/HeroStory.astro'))).resolves.toBeUndefined();
  });
});
