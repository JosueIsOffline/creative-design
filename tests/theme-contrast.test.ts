import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// bg-brand-lilac is a fixed fill (unchanged across themes). Against the
// near-white light-mode background it has too little contrast to read as
// a distinct button (reported live: the Hero "Ver catálogo" CTA was
// invisible in light mode). Every bg-brand-lilac element needs a
// border-accent edge: in dark mode it blends into the fill (harmless,
// the fill already contrasts against the near-black page background), in
// light mode the darker accent border gives it a visible edge.
const FILES = [
  'src/components/Hero.astro',
  'src/components/ProductCard.astro',
  'src/components/CategoryFilter.astro',
  'src/pages/catalogo/[categoria]/[producto].astro',
];

describe('bg-brand-lilac fills have a theme-aware border for light-mode contrast', () => {
  for (const file of FILES) {
    it(`${file} uses border-accent, not the old fixed border-brand-lilac`, async () => {
      const src = await fs.readFile(path.join(process.cwd(), file), 'utf-8');
      expect(src, `${file} still contains border-brand-lilac`).not.toContain('border-brand-lilac');
      expect(src, `${file} is missing border-accent`).toContain('border-accent');
    });
  }
});
