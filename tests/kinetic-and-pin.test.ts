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

  it('Services headings use the kinetic-heading reveal; About uses the paragraph variant for its manifesto', async () => {
    const services = await read('src/components/Services.astro');
    const about = await read('src/components/About.astro');
    expect(services).toContain('data-gsap="kinetic-heading"');
    expect(about).toContain('data-gsap="kinetic-paragraph"');
  });

  it('scroll-reveal.ts splits [data-gsap="kinetic-heading"] elements into characters (not just words)', async () => {
    const src = await read('src/scripts/scroll-reveal.ts');
    expect(src).toContain('splitChars');
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
  it('About is a static full-bleed photo section — no pin, no hover list, no script signature', async () => {
    const src = await read('src/components/About.astro');
    expect(src, 'should have a full-bleed background photo with a dark scrim').toContain('bg-black/70');
    expect(src, 'should have dropped the hairline valores list').not.toContain('valor-row');
    expect(src, 'should have dropped the old boxed-card layout too').not.toContain('valor-card');
    expect(src, 'should have dropped the script-font signature from the manifesto attempt').not.toContain('font-script');
    expect(src, 'should not be pinned/scrubbed like Services').not.toContain('ScrollTrigger');
    expect(src, 'the historia paragraph reveals word-by-word, not character-by-character like short titles').toContain('data-gsap="kinetic-paragraph"');
    expect(src, 'the heading reveals letter-by-letter, consistent with Services/Catálogo').toContain('data-gsap="kinetic-heading"');
    expect(src).toContain('film-grain');
  });

  it('scroll-reveal.ts reveals [data-gsap="kinetic-paragraph"] word-by-word with a blur, for longer passages', async () => {
    const src = await read('src/scripts/scroll-reveal.ts');
    expect(src).toContain("import { splitChars, splitWords } from './split-text'");
    expect(src).toContain('[data-gsap="kinetic-paragraph"]');
    expect(src, 'should still blur-reveal, consistent with kinetic-heading').toContain("filter: 'blur(8px)'");
  });

  it('Catálogo pages get a much bigger title inside a distinct background band, not just a text-style swap', async () => {
    const index = await read('src/pages/catalogo/index.astro');
    const category = await read('src/pages/catalogo/[categoria].astro');
    for (const src of [index, category]) {
      expect(src).toContain('data-gsap="kinetic-heading"');
      expect(src).toContain('film-grain');
      expect(src, 'the header should sit on a visibly distinct background band').toContain('bg-surface');
      expect(src, 'title should be hero-scale, not a modest heading size').toContain('text-8xl');
    }
  });
});
