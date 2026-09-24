import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const FILES = [
  'src/components/Hero.astro',
  'src/components/About.astro',
  'src/components/Services.astro',
  'src/components/CategoryFilter.astro',
  'src/components/Footer.astro',
  'src/components/ProductCard.astro',
  'src/pages/index.astro',
  'src/pages/catalogo/index.astro',
  'src/pages/catalogo/[categoria].astro',
  'src/pages/catalogo/[categoria]/[producto].astro',
];

// These have zero legitimate exceptions anywhere in FILES — every
// occurrence must have been migrated to a semantic token.
const FORBIDDEN_EVERYWHERE = [
  'bg-brand-surface',
  'border-gray-800',
  'border-gray-700',
  'text-gray-300',
  'text-gray-400',
  'text-gray-500',
  'text-brand-lilac',
  'hover:text-brand-lilac',
];

// Hero.astro's CTA icon chip, ProductCard.astro's card-close overlay button
// and card-whatsapp icon chip, and the product-detail page's WhatsApp icon
// chip intentionally KEEP `bg-brand-black`/`text-white` (see Global
// Constraints — brand-fixed elements). Only files with no such exception
// get checked for these two classes.
const FORBIDDEN_NO_BRAND_FIXED_EXCEPTIONS = ['bg-brand-black', 'text-white'];
const FILES_WITH_BRAND_FIXED_EXCEPTIONS = new Set([
  'src/components/Hero.astro',
  'src/components/ProductCard.astro',
  'src/pages/catalogo/[categoria]/[producto].astro',
]);

describe('theme migration: no legacy color classes remain', () => {
  for (const file of FILES) {
    it(`${file} has no legacy classes`, async () => {
      const src = await fs.readFile(path.join(process.cwd(), file), 'utf-8');
      const forbidden = FILES_WITH_BRAND_FIXED_EXCEPTIONS.has(file)
        ? FORBIDDEN_EVERYWHERE
        : [...FORBIDDEN_EVERYWHERE, ...FORBIDDEN_NO_BRAND_FIXED_EXCEPTIONS];
      for (const cls of forbidden) {
        expect(src, `${file} still contains "${cls}"`).not.toContain(cls);
      }
    });
  }
});
