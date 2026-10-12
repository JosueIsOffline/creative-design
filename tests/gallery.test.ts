import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('Gallery (adapted from the Halo reference floating gallery)', () => {
  it('uses real catalog product photos, not stock images', async () => {
    const src = await read('src/components/Gallery.astro');
    expect(src).toContain('product.fotos[0]');
    expect(src, 'should take real products as a prop, not hardcoded placeholder data').toContain('products: Product[]');
  });

  it('each picture drifts vertically at its own speed, scroll-linked', async () => {
    const src = await read('src/components/Gallery.astro');
    expect(src).toContain('data-float-speed');
    expect(src).toContain('scrub: true');
    expect(src, 'should gate on reduced motion').toContain('prefers-reduced-motion: no-preference');
  });

  it('re-mounts safely via a per-element marker on astro:page-load', async () => {
    const src = await read('src/components/Gallery.astro');
    expect(src).toContain('dataset.floatMounted');
    expect(src).toContain("addEventListener('astro:page-load', mount)");
  });

  it('the home page places it between the Destacados rail and About, driven by real fetched products', async () => {
    const src = await read('src/pages/index.astro');
    expect(src).toContain("import Gallery from '../components/Gallery.astro'");
    expect(src).toContain('products={galeria}');
  });
});
