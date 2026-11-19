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
  setDetails,
  emojiFor,
  discountAmount,
} from '../src/scripts/cart';

const TAZA = { slug: 'tazas', productSlug: 'taza-blanca', name: 'Taza Blanca', price: 350, photo: 'https://example.com/taza.jpg' };
const VASO = { slug: 'vasos', productSlug: 'vaso-termico', name: 'Vaso Térmico', price: 650, photo: 'https://example.com/vaso.jpg' };

beforeEach(() => {
  clearCart();
});

describe('addItem', () => {
  it('adds a new product with quantity 1', () => {
    addItem(TAZA);
    expect(getCart()).toEqual([{ ...TAZA, quantity: 1 }]);
  });

  it('increments quantity when the same product is added again', () => {
    addItem(TAZA);
    addItem(TAZA);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it('keeps products with the same productSlug in different categories as separate lines', () => {
    addItem(TAZA);
    addItem({ ...VASO, productSlug: TAZA.productSlug });
    expect(getCart()).toHaveLength(2);
  });
});

describe('removeItem', () => {
  it('removes only the matching slug+productSlug pair', () => {
    addItem(TAZA);
    addItem(VASO);
    removeItem(TAZA.slug, TAZA.productSlug);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].productSlug).toBe(VASO.productSlug);
  });
});

describe('setQuantity', () => {
  it('updates the quantity of the matching item', () => {
    addItem(TAZA);
    setQuantity(TAZA.slug, TAZA.productSlug, 5);
    expect(getCart()[0].quantity).toBe(5);
  });

  it('removes the item when the quantity drops to 0 or below', () => {
    addItem(TAZA);
    setQuantity(TAZA.slug, TAZA.productSlug, 0);
    expect(getCart()).toHaveLength(0);
  });
});

describe('getTotal', () => {
  it('sums price * quantity across all items', () => {
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
    const stored = [{ ...TAZA, quantity: 3 }];
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
    expect(parseCartJson(JSON.stringify([{ ...TAZA, quantity: 0 }]))).toEqual([]);
    expect(parseCartJson(JSON.stringify([{ ...TAZA, quantity: 2 }, null]))).toEqual([{ ...TAZA, quantity: 2 }]);
  });
});

describe('carts saved before the English rename', () => {
  it('reads the old Spanish keys (and their details) into the new shape', () => {
    const legacy = [{ slug: 'tazas', productoSlug: 'taza-blanca', nombre: 'Taza Blanca', precio: 350, foto: 'https://example.com/taza.jpg', cantidad: 2,
      detalle: { texto: 'Ana', colores: 'lila', fecha: '2026-12-20', foto: true } }];
    expect(parseCartJson(JSON.stringify(legacy))).toEqual([{ ...TAZA, quantity: 2, details: { text: 'Ana', colors: 'lila', date: '2026-12-20', sendsPhoto: true } }]);
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
      { ...TAZA, quantity: 2 },
      { ...VASO, quantity: 1 },
    ];
    const message = buildWhatsAppMessage(cart, '');
    expect(message).toContain('- ☕ *Taza Blanca* x2 — RD$ 700');
    expect(message).toContain('- 🥤 *Vaso Térmico* x1 — RD$ 650');
    expect(message).toContain('*Total: RD$ 1,350*');
  });

  it('appends the note only when it is non-empty', () => {
    const cart = [{ ...TAZA, quantity: 1 }];
    expect(buildWhatsAppMessage(cart, '')).not.toContain('Notas:');
    expect(buildWhatsAppMessage(cart, '  ')).not.toContain('Notas:');
    expect(buildWhatsAppMessage(cart, 'Azul y blanco por favor')).toContain('Notas: Azul y blanco por favor');
  });

  it('puts each piece\'s personalization right under its line', () => {
    addItem(TAZA);
    addItem(VASO);
    setDetails('tazas', 'taza-blanca', { text: ' Ana, Luis ', colors: '', date: '2026-12-20', sendsPhoto: true });
    const lines = buildWhatsAppMessage(getCart(), '').split('\n');
    const taza = lines.indexOf('- ☕ *Taza Blanca* x1 — RD$ 350');
    expect(lines.slice(taza + 1, taza + 4)).toEqual([
      '   · Texto: Ana, Luis',
      '   · Para el 20 de diciembre',
      '   · Te envío la foto o el diseño por aquí',
    ]);
    expect(lines[taza + 4]).toBe('- 🥤 *Vaso Térmico* x1 — RD$ 650'); // no detail, no extra lines
    expect(getCart()[0].details).toEqual({ text: ' Ana, Luis ', date: '2026-12-20', sendsPhoto: true }); // empty colors dropped
  });

  it('drops malformed details from storage instead of trusting it', () => {
    const [item] = parseCartJson(JSON.stringify([{ ...TAZA, quantity: 1, details: { text: 5, date: 'mañana', sendsPhoto: 'yes', x: 1 } }]));
    expect(item).toEqual({ ...TAZA, quantity: 1 });
  });
});

describe('emojiFor', () => {
  it('gives each catalog category its emoji, and a neutral one for anything new', () => {
    const slugs = ['tazas', 'vasos', 'bolsos', 'fundas', 'camisetas', 'llaveros', 'servicios-de-diseno', 'otra-cosa'];
    expect(slugs.map(emojiFor)).toEqual(['☕', '🥤', '👜', '📱', '👕', '🔑', '✏️', '✨']);
  });
});

describe('discounts in the message', () => {
  it("uses the server's amount, capped to the subtotal and never negative", () => {
    expect(discountAmount(3200, { code: 'A', kind: 'percent', value: 10, amount: 320 })).toBe(320);
    expect(discountAmount(200, { code: 'B', kind: 'amount', value: 300, amount: 300 })).toBe(200);
    expect(discountAmount(500, { code: 'C', kind: 'amount', value: 50, amount: -5 })).toBe(0);
    expect(discountAmount(3200, null)).toBe(0);
  });

  it('shows subtotal, the code and the discounted total in the message', () => {
    const lines = buildWhatsAppMessage([{ ...TAZA, quantity: 2 }], '', { code: 'NAVIDAD10', kind: 'percent', value: 10, amount: 70 }).split('\n');
    expect(lines.slice(-3)).toEqual(['Subtotal: RD$ 700', 'Descuento (NAVIDAD10, 10%): -RD$ 70', '*Total: RD$ 630*']);
  });
});
