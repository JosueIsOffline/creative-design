import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCart,
  addItem,
  removeItem,
  setQuantity,
  getTotal,
  clearCart,
  buildWhatsAppMessage,
  parseCartJson,
  esc,
} from '../src/scripts/cart';

const TAZA = { slug: 'tazas', productoSlug: 'taza-blanca', nombre: 'Taza Blanca', precio: 350, foto: 'https://example.com/taza.jpg' };
const VASO = { slug: 'vasos', productoSlug: 'vaso-termico', nombre: 'Vaso Térmico', precio: 650, foto: 'https://example.com/vaso.jpg' };

beforeEach(() => {
  clearCart();
});

describe('addItem', () => {
  it('adds a new product with cantidad 1', () => {
    addItem(TAZA);
    expect(getCart()).toEqual([{ ...TAZA, cantidad: 1 }]);
  });

  it('increments cantidad when the same product is added again', () => {
    addItem(TAZA);
    addItem(TAZA);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].cantidad).toBe(2);
  });

  it('keeps products with the same productoSlug in different categories as separate lines', () => {
    addItem(TAZA);
    addItem({ ...VASO, productoSlug: TAZA.productoSlug });
    expect(getCart()).toHaveLength(2);
  });
});

describe('removeItem', () => {
  it('removes only the matching slug+productoSlug pair', () => {
    addItem(TAZA);
    addItem(VASO);
    removeItem(TAZA.slug, TAZA.productoSlug);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].productoSlug).toBe(VASO.productoSlug);
  });
});

describe('setQuantity', () => {
  it('updates the quantity of the matching item', () => {
    addItem(TAZA);
    setQuantity(TAZA.slug, TAZA.productoSlug, 5);
    expect(getCart()[0].cantidad).toBe(5);
  });

  it('removes the item when the quantity drops to 0 or below', () => {
    addItem(TAZA);
    setQuantity(TAZA.slug, TAZA.productoSlug, 0);
    expect(getCart()).toHaveLength(0);
  });
});

describe('getTotal', () => {
  it('sums precio * cantidad across all items', () => {
    addItem(TAZA);
    addItem(TAZA);
    addItem(VASO);
    expect(getTotal()).toBe(350 * 2 + 650);
  });
});

describe('parseCartJson', () => {
  it('returns an empty array for null, invalid JSON, or a non-array value', () => {
    expect(parseCartJson(null)).toEqual([]);
    expect(parseCartJson('{not valid json')).toEqual([]);
    expect(parseCartJson('{"not":"an array"}')).toEqual([]);
  });

  it('returns the parsed array when it is valid', () => {
    const stored = [{ ...TAZA, cantidad: 3 }];
    expect(parseCartJson(JSON.stringify(stored))).toEqual(stored);
  });

  it('drops elements that are not well-formed cart items instead of crashing', () => {
    // Review finding: Array.isArray alone isn't enough — a corrupted or
    // hand-edited localStorage.cart value can be a valid array containing
    // garbage. cart.ts is a shared chunk imported on every page, so a
    // single bad element (e.g. null, or an old-format object) would throw
    // inside updateBadge()/renderList() and break the whole site.
    expect(parseCartJson(JSON.stringify([null]))).toEqual([]);
    expect(parseCartJson(JSON.stringify([{}]))).toEqual([]);
    expect(parseCartJson(JSON.stringify([{ ...TAZA, cantidad: 0 }]))).toEqual([]);
    expect(parseCartJson(JSON.stringify([{ ...TAZA, cantidad: 2 }, null]))).toEqual([{ ...TAZA, cantidad: 2 }]);
  });
});

describe('esc', () => {
  it('escapes HTML-significant characters', () => {
    expect(esc('Taza "Mamá" <3 & tú')).toBe('Taza &quot;Mamá&quot; &lt;3 &amp; tú');
  });

  it('leaves plain text untouched', () => {
    expect(esc('Taza Blanca')).toBe('Taza Blanca');
  });
});

describe('buildWhatsAppMessage', () => {
  it('lists each item with quantity and subtotal, and the grand total', () => {
    const cart = [
      { ...TAZA, cantidad: 2 },
      { ...VASO, cantidad: 1 },
    ];
    const message = buildWhatsAppMessage(cart, '');
    expect(message).toContain('- Taza Blanca x2 — RD$ 700');
    expect(message).toContain('- Vaso Térmico x1 — RD$ 650');
    expect(message).toContain('Total: RD$ 1,350');
  });

  it('appends the note only when it is non-empty', () => {
    const cart = [{ ...TAZA, cantidad: 1 }];
    expect(buildWhatsAppMessage(cart, '')).not.toContain('Notas:');
    expect(buildWhatsAppMessage(cart, '  ')).not.toContain('Notas:');
    expect(buildWhatsAppMessage(cart, 'Azul y blanco por favor')).toContain('Notas: Azul y blanco por favor');
  });
});
