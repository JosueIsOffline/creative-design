import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('Catálogo product grid has a more generous side gutter', () => {
  for (const file of ['src/pages/catalogo/index.astro', 'src/pages/catalogo/[categoria].astro']) {
    it(`${file} grid uses px-8 instead of the cramped px-6`, async () => {
      const src = await fs.readFile(path.join(process.cwd(), file), 'utf-8');
      expect(src).toContain('px-8');
    });
  }
});
