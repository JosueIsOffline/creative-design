import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('mobile responsive fixes from the browser audit', () => {
  it('Footer gets extra bottom padding on mobile so the WhatsApp FAB does not clip the copyright line', async () => {
    const src = await read('src/components/Footer.astro');
    expect(src, 'should pad extra on mobile and relax it back at sm+').toContain('pb-24 sm:pb-10');
  });

  it('BaseLayout offers a mobile nav fallback (Catálogo/Nosotros) below the sm breakpoint', async () => {
    const src = await read('src/layouts/BaseLayout.astro');
    expect(src, 'main nav stays desktop-only').toContain('hidden sm:flex');
    expect(src, 'a mobile-only disclosure menu should exist').toContain('sm:hidden');
    expect(src, 'mobile menu should link to the catalog').toContain('href="/catalogo"');
    expect(src, 'mobile menu should link to the about section').toContain('href="/#sobre-la-marca"');
  });
});
