/** What this piece carries: every product here is personalized, so it lives per line, not per order. */
export type Details = {
  text?: string; // name or phrase to print
  colors?: string; // colors or style
  date?: string; // yyyy-mm-dd, when it's needed
  sendsPhoto?: boolean; // the client will send a photo/design over WhatsApp
};

export type CartItem = {
  slug: string; // category slug
  productSlug: string;
  name: string;
  price: number;
  photo: string;
  quantity: number;
  details?: Details;
};

export function cartId(item: Pick<CartItem, 'slug' | 'productSlug'>): string {
  return `${item.slug}/${item.productSlug}`;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.slice(0, 300) : undefined);

/** Keeps only well-typed fields (storage is user-editable); undefined when nothing is set. */
export function cleanDetails(value: unknown): Details | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const d: Details = {
    text: str(v.text),
    colors: str(v.colors),
    date: typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : undefined,
    sendsPhoto: v.sendsPhoto === true || undefined,
  };
  (Object.keys(d) as (keyof Details)[]).forEach((k) => d[k] === undefined && delete d[k]);
  return Object.keys(d).length ? d : undefined;
}

export const hasDetails = (item: CartItem) => cleanDetails(item.details) !== undefined;

/**
 * Carts saved before the code moved to English used Spanish keys
 * (productoSlug, nombre, precio, foto, cantidad, detalle{texto,colores,fecha,foto}).
 * They're read as-is and rewritten in the new shape on the next save.
 */
function fromLegacy(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const v = value as Record<string, unknown>;
  if (!('nombre' in v) && !('cantidad' in v)) return value;
  const d = (v.detalle ?? {}) as Record<string, unknown>;
  return {
    slug: v.slug, productSlug: v.productoSlug, name: v.nombre, price: v.precio, photo: v.foto, quantity: v.cantidad,
    details: { text: d.texto, colors: d.colores, date: d.fecha, sendsPhoto: d.foto },
  };
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.slug === 'string' &&
    typeof item.productSlug === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.photo === 'string' &&
    Number.isInteger(item.quantity) &&
    (item.quantity as number) > 0
  );
}

export function parseCartJson(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(fromLegacy).filter(isCartItem).map((item) => {
      const details = cleanDetails(item.details);
      const { details: _, ...rest } = item;
      return details ? { ...rest, details } : rest;
    });
  } catch {
    return [];
  }
}

const ESCAPE_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

const STORAGE_KEY = 'cart';
let memoryCart: CartItem[] = [];

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function readCart(): CartItem[] {
  if (!hasLocalStorage()) return memoryCart;
  return parseCartJson(localStorage.getItem(STORAGE_KEY));
}

function writeCart(cart: CartItem[]): void {
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // storage unavailable/full — the cart just won't persist across reloads
    }
  } else {
    memoryCart = cart;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cart:change'));
  }
}

export function getCart(): CartItem[] {
  return readCart();
}

export function addItem(item: Omit<CartItem, 'quantity'>): void {
  const cart = readCart();
  const id = cartId(item);
  const existing = cart.find((i) => cartId(i) === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  writeCart(cart);
}

export function removeItem(slug: string, productSlug: string): void {
  const id = cartId({ slug, productSlug });
  writeCart(readCart().filter((i) => cartId(i) !== id));
}

export function setQuantity(slug: string, productSlug: string, quantity: number): void {
  const id = cartId({ slug, productSlug });
  const cart = readCart();
  if (quantity <= 0) {
    writeCart(cart.filter((i) => cartId(i) !== id));
    return;
  }
  const item = cart.find((i) => cartId(i) === id);
  if (!item) return;
  item.quantity = quantity;
  writeCart(cart);
}

export function setDetails(slug: string, productSlug: string, details: Details): void {
  const id = cartId({ slug, productSlug });
  const cart = readCart();
  const item = cart.find((i) => cartId(i) === id);
  if (!item) return;
  const clean = cleanDetails(details);
  if (clean) item.details = clean;
  else delete item.details;
  writeCart(cart);
}

export function getTotal(cart: CartItem[] = readCart()): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function clearCart(): void {
  writeCart([]);
}

/** 2026-12-20 → "20 de diciembre". Noon UTC so no timezone shifts the day. */
export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

// One emoji per kind of piece, so the message scans at a glance. Matched by
// words in the category slug (Sheet data, hence in Spanish), so a slightly
// different category name still works.
const EMOJI: [RegExp, string][] = [
  [/taza/, '☕'], [/vaso|termo/, '🥤'], [/camis|hoodie|sudader/, '👕'], [/bols|tote/, '👜'],
  [/funda|celular/, '📱'], [/llaver/, '🔑'], [/servicio|disen|diseñ|papeler|flyer/, '✏️'],
];
export const emojiFor = (slug: string) => EMOJI.find(([re]) => re.test(slug))?.[1] ?? '✨';

const rd = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;

/** A piece's line in the message. The cart page finds a piece's lines by this exact string. */
export const itemLine = (item: CartItem) =>
  `- ${emojiFor(item.slug)} *${item.name.replace(/\*/g, '')}* x${item.quantity} — ${rd(item.price * item.quantity)}`;

/**
 * A code applied in the cart, as the coupons server validated it: `amount` is the
 * discount the server computed (it knows the real prices and which products qualify).
 */
export type Discount = { code: string; kind: 'percent' | 'amount'; value: number; amount: number };

/** Pesos off the subtotal: the server's amount, never negative or more than the subtotal. */
export function discountAmount(subtotal: number, discount?: Discount | null): number {
  return discount ? Math.max(0, Math.min(subtotal, Math.round(discount.amount))) : 0;
}

/** WhatsApp renders *text* as bold: piece names and the total go out bold. The text itself is the client's (Spanish). */
export function buildWhatsAppMessage(cart: CartItem[], note: string, discount?: Discount | null): string {
  const lines = cart.flatMap((item) => {
    const d = cleanDetails(item.details) ?? {};
    return [
      itemLine(item),
      ...(d.text ? [`   · Texto: ${d.text.trim()}`] : []),
      ...(d.colors ? [`   · Colores/estilo: ${d.colors.trim()}`] : []),
      ...(d.date ? [`   · Para el ${formatDate(d.date)}`] : []),
      ...(d.sendsPhoto ? ['   · Te envío la foto o el diseño por aquí'] : []),
    ];
  });
  const subtotal = getTotal(cart);
  const off = discountAmount(subtotal, discount);
  const totals = off
    ? [
        `Subtotal: ${rd(subtotal)}`,
        `Descuento (${discount!.code}${discount!.kind === 'percent' ? `, ${discount!.value}%` : ''}): -${rd(off)}`,
        `*Total: ${rd(subtotal - off)}*`,
      ]
    : [`*Total: ${rd(subtotal)}*`];
  const parts = ['Hola! Quiero hacer este pedido:', '', ...lines, '', ...totals];
  const cleanNote = note.trim();
  if (cleanNote) parts.push('', `Notas: ${cleanNote}`);
  return parts.join('\n');
}

if (typeof document !== 'undefined') {
  const updateBadge = () => {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
  };

  // #cart-toggle is a plain <a href="/carrito"> link — no click wiring needed here, the browser just navigates.
  window.addEventListener('cart:change', updateBadge);
  updateBadge();
}
