import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('FinalCta (adapted from the Halo reference closing plate)', () => {
  it('grows the panel from a small card to full screen while pinned, desktop + motion-safe only', async () => {
    const src = await read('src/components/FinalCta.astro');
    expect(src).toContain('scale: 0.4');
    expect(src).toContain('scale: 1');
    expect(src).toContain("borderRadius: '0rem'");
    expect(src).toContain('pin: true');
    expect(src, 'should gate on a desktop-width media query').toContain('min-width: 1024px');
    expect(src, 'should still respect reduced motion').toContain('prefers-reduced-motion: no-preference');
  });

  it('only animates compositor-friendly transform/paint properties (scale + border-radius), not width/height', async () => {
    const src = await read('src/components/FinalCta.astro');
    expect(src, 'animating layout-triggering width/height on scrub would be janky').not.toMatch(/width:\s*['"]100v?w/);
  });

  it('has a real WhatsApp link and a magnetic CTA button', async () => {
    const src = await read('src/components/FinalCta.astro');
    expect(src).toContain('wa.me/${whatsapp}');
    expect(src).toContain('data-magnetic');
  });

  it('re-mounts safely via a per-element marker on astro:page-load', async () => {
    const src = await read('src/components/FinalCta.astro');
    expect(src).toContain('dataset.finalCtaMounted');
    expect(src).toContain("addEventListener('astro:page-load', mount)");
  });

  it('the home page closes with it, after About', async () => {
    const src = await read('src/pages/index.astro');
    expect(src).toContain("import FinalCta from '../components/FinalCta.astro'");
    expect(src).toContain('<FinalCta />');
  });
});
