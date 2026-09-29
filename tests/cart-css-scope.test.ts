import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('card-add-to-cart is always visible, never a hide-until-expand rule', () => {
  it('global.css has no rule that hides .card-add-to-cart by default', async () => {
    // Originally .card-add-to-cart was hidden by default (opacity:0,
    // max-height:0, pointer-events:none) and only revealed inside
    // .product-card.is-expanded — which briefly broke the product detail
    // page's copy of this button (never nested in .product-card, so an
    // unscoped version of that rule made it permanently invisible).
    //
    // The Apple Store style pass made the button always visible in both
    // places instead (no more reveal-on-expand), which removes the whole
    // class of bug rather than just scoping around it. All that should be
    // left for .card-add-to-cart is the press-feedback transition.
    const css = await fs.readFile(path.join(process.cwd(), 'src/styles/global.css'), 'utf-8');
    expect(css, 'a hide-until-expand rule for card-add-to-cart still exists').not.toContain('.card-add-to-cart.is-hiding');
    expect(css, 'a hide-until-expand rule for card-add-to-cart still exists').not.toContain('.card-add-to-cart.is-precollapsed');

    const unscopedBlock = css.match(/\n\.card-add-to-cart \{([^}]*)\}/);
    expect(unscopedBlock, 'expected the unscoped .card-add-to-cart rule (press-feedback transition)').not.toBeNull();
    expect(unscopedBlock![1]).not.toContain('pointer-events');
    expect(unscopedBlock![1]).not.toContain('opacity');
  });
});
