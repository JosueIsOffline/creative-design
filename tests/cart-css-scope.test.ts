import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('the card-add-to-cart reveal-on-expand styling stays scoped to product cards', () => {
  it('does not hide the standalone add-to-cart button on the product detail page', async () => {
    // The reveal-on-expand rule (opacity:0, max-height:0, pointer-events:none
    // by default, only visible inside .product-card.is-expanded) was written
    // for ProductCard's collapsed/expanded card only. The product detail
    // page reuses the .card-add-to-cart class (for the shared click
    // delegation in ProductModal.astro) on a button that is never nested
    // inside a .product-card — an unscoped base rule would make that
    // button permanently invisible and unclickable.
    const css = await fs.readFile(path.join(process.cwd(), 'src/styles/global.css'), 'utf-8');
    expect(css, 'global.css still has an unscoped .card-add-to-cart base rule').not.toContain('\n.card-add-to-cart {');
    expect(css).toContain('.product-card .card-add-to-cart {');
  });
});
