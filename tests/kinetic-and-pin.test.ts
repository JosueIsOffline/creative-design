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

  it('scroll-reveal.ts splits [data-gsap="kinetic-heading"] elements into characters (not just words)', async () => {
    const src = await read('src/scripts/scroll-reveal.ts');
    expect(src).toContain("import { splitChars } from './split-text'");
    expect(src).toContain('splitChars(heading)');
    expect(src).toContain('[data-gsap="kinetic-heading"]');
  });

  it('kinetic heading characters reveal from a blur, not just a plain fade', async () => {
    const src = await read('src/scripts/scroll-reveal.ts');
    expect(src, 'should animate the CSS filter from blurred to sharp').toContain("filter: 'blur(");
  });
});

describe('Services pinned intro (cinematic header)', () => {
  it('editorial list rows (Services, About) are not double-animated by the generic card fade', async () => {
    const src = await read('src/scripts/scroll-reveal.ts');
    expect(src).toContain("querySelectorAll('.product-card')");
    expect(src, 'should no longer target the retired .valor-card boxed layout').not.toContain('.valor-card');
  });

  it('pins the intro and Ken-Burns the background image, desktop + motion-safe only', async () => {
    const src = await read('src/components/Services.astro');
    expect(src).toContain('pin: true');
    expect(src).toContain('scrub:');
    expect(src, 'should gate on a desktop-width media query').toContain('min-width: 1024px');
    expect(src, 'should still respect reduced motion').toContain('prefers-reduced-motion: no-preference');
    expect(src, 'the intro image should subtly zoom out (Ken Burns) while pinned').toContain('scale: 1.15');
  });
});

describe('Services editorial list with cursor-following preview', () => {
  it('renders a service list where each row carries its own preview image', async () => {
    const src = await read('src/components/Services.astro');
    expect(src, 'each service needs its own representative image').toContain('imagen:');
    expect(src).toContain('service-row');
    expect(src).toContain('data-service-image={s.imagen}');
  });

  it('shows a cursor-following preview with a blur-to-sharp crossfade, fine-pointer + hover-capable only', async () => {
    const src = await read('src/components/Services.astro');
    expect(src).toContain('service-preview');
    expect(src, 'should gate on hover-capable, fine-pointer devices').toContain('(hover: hover) and (pointer: fine)');
    expect(src).toContain('service-preview-blur');
    expect(src).toContain('service-preview-sharp');
    expect(src, 'preview position should follow the pointer').toContain('pointermove');
  });

  it('snaps the preview to the pointer position on enter, so arriving via scroll does not flash it at (0,0)', async () => {
    const src = await read('src/components/Services.astro');
    expect(src, 'pointerenter should receive the event to read its coordinates').toContain("addEventListener('pointerenter', (e)");
    expect(src, 'should set the preview position immediately from the enter event').toContain('gsap.set(preview, { x: e.clientX + 24, y: e.clientY - 80 })');
  });

  it('has a subtle film-grain texture over the section', async () => {
    const src = await read('src/components/Services.astro');
    const css = await read('src/styles/global.css');
    expect(src).toContain('film-grain');
    expect(css).toContain('.film-grain');
  });
});

describe('About and Catálogo integrated into the editorial/cinematic language', () => {
  it('About pairs the story with a photo and lists valores as a hairline editorial list (not boxed cards)', async () => {
    const src = await read('src/components/About.astro');
    expect(src, 'should show a photo alongside the brand story').toContain('imagen =');
    expect(src).toContain('valor-row');
    expect(src, 'should have dropped the old boxed-card layout').not.toContain('valor-card');
    expect(src).toContain('film-grain');
  });

  it('Catálogo pages get the same mono-eyebrow + kinetic-heading header treatment', async () => {
    const index = await read('src/pages/catalogo/index.astro');
    const category = await read('src/pages/catalogo/[categoria].astro');
    for (const src of [index, category]) {
      expect(src).toContain('data-gsap="kinetic-heading"');
      expect(src).toContain('film-grain');
      expect(src, 'should keep the mono eyebrow label pattern').toContain('tracking-[0.2em]');
    }
  });
});
