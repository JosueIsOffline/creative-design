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
    expect(css).toContain('.product-card .card-add-to-cart {');
    // An unscoped `.card-add-to-cart { ... }` rule is fine (e.g. the
    // press-feedback transition, which applies correctly to both the
    // card's button and the detail page's) as long as it never sets the
    // hiding properties — that combination on an unscoped selector is
    // what made the detail page's button permanently invisible before.
    const unscopedBlock = css.match(/\n\.card-add-to-cart \{([^}]*)\}/);
    expect(unscopedBlock, 'expected the unscoped .card-add-to-cart rule (press-feedback transition)').not.toBeNull();
    expect(unscopedBlock![1]).not.toContain('pointer-events');
    expect(unscopedBlock![1]).not.toContain('opacity');
  });
});
