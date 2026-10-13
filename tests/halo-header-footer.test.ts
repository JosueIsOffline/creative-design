import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('Floating header pill (adapted from the Halo reference header)', () => {
  it('is fixed and floating, not sticky/in-flow, so Hero no longer needs to subtract its height', async () => {
    const layout = await read('src/layouts/BaseLayout.astro');
    const hero = await read('src/components/Hero.astro');
    expect(layout).toContain('fixed inset-x-0 top-6');
    expect(layout, 'should no longer reserve document-flow height').not.toContain('sticky top-0');
    expect(hero, 'Hero reverts to plain min-h-screen now that the header floats over it').toContain('min-h-screen');
  });

  it('hides on scroll-down and reappears on scroll-up, and goes solid once scrolled', async () => {
    const script = await read('src/scripts/header.ts');
    const css = await read('src/styles/global.css');
    expect(script).toContain("classList.toggle('is-away', y > lastY && y > 80)");
    expect(script).toContain("classList.toggle('is-scrolled', y > 10)");
    expect(css).toContain('#site-header.is-away');
    expect(css).toContain('#site-header.is-scrolled .header-pill');
  });

  it('reads an explicit data-nav-theme marker instead of sampling pixel colors (simplified vs. the reference)', async () => {
    const script = await read('src/scripts/header.ts');
    expect(script).toContain("closest('[data-nav-theme=\"dark\"]')");
    const services = await read('src/components/Services.astro');
    const about = await read('src/components/About.astro');
    expect(services, 'the always-dark pinned intro needs the marker').toContain('data-nav-theme="dark"');
    expect(about, 'the always-dark photo section needs the marker too').toContain('data-nav-theme="dark"');
  });

  it('re-checks tone on every astro:page-load, not just once at mount', async () => {
    const script = await read('src/scripts/header.ts');
    expect(script).toContain("addEventListener('astro:page-load', mount)");
  });
});

describe('Footer (adapted from the Halo reference footer)', () => {
  it('has a 4-column layout: brand, pages, contact, social', async () => {
    const src = await read('src/components/Footer.astro');
    expect(src).toContain('grid-cols-2 sm:grid-cols-4');
    expect(src).toContain('aria-label="Footer"');
  });

  it('reveals a giant wordmark letter-by-letter once scrolled into view', async () => {
    const src = await read('src/components/Footer.astro');
    expect(src).toContain('data-footer-wordmark');
    expect(src).toContain("Array.from('Creative Design')");
    expect(src).toContain('yPercent: 60');
    expect(src).toContain('once: true');
  });

  it('guards the reveal at setup time (not just play time) so a persisted footer never stacks duplicate tweens', async () => {
    const src = await read('src/components/Footer.astro');
    expect(src).toContain('dataset.wordmarkMounted');
  });

  it('has a back-to-top link in the legal bar', async () => {
    const src = await read('src/components/Footer.astro');
    expect(src).toContain('href="#top"');
    expect(src).toContain('Volver arriba');
  });
});
