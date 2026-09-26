import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('the product detail page also uses add-to-cart, not its own WhatsApp link', () => {
  it('has no leftover direct wa.me button', async () => {
    const src = await fs.readFile(
      path.join(process.cwd(), 'src/pages/catalogo/[categoria]/[producto].astro'),
      'utf-8'
    );
    expect(src).not.toContain('Solicitar por WhatsApp');
    expect(src).not.toContain('wa.me');
    expect(src).toContain('card-add-to-cart');
    expect(src).toContain('Agregar al carrito');
  });
});
