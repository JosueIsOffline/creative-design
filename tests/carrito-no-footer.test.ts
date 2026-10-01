import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('the cart page hides the site footer', () => {
  it('BaseLayout supports a hideFooter prop that skips <Footer />', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/layouts/BaseLayout.astro'), 'utf-8');
    expect(src).toContain('hideFooter?: boolean');
    expect(src).toContain('{!hideFooter && <Footer transition:persist />}');
  });

  it('carrito.astro passes hideFooter to BaseLayout', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/pages/carrito.astro'), 'utf-8');
    expect(src).toMatch(/<BaseLayout[^>]*\bhideFooter\b/);
  });
});
