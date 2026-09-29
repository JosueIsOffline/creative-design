export type CartItem = {
  slug: string;
  productoSlug: string;
  nombre: string;
  precio: number;
  foto: string;
  cantidad: number;
};

export function cartId(item: Pick<CartItem, 'slug' | 'productoSlug'>): string {
  return `${item.slug}/${item.productoSlug}`;
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.slug === 'string' &&
    typeof item.productoSlug === 'string' &&
    typeof item.nombre === 'string' &&
    typeof item.precio === 'number' &&
    typeof item.foto === 'string' &&
    Number.isInteger(item.cantidad) &&
    (item.cantidad as number) > 0
  );
}

export function parseCartJson(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
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

export function addItem(item: Omit<CartItem, 'cantidad'>): void {
  const cart = readCart();
  const id = cartId(item);
  const existing = cart.find((i) => cartId(i) === id);
  if (existing) {
    existing.cantidad += 1;
  } else {
    cart.push({ ...item, cantidad: 1 });
  }
  writeCart(cart);
}

export function removeItem(slug: string, productoSlug: string): void {
  const id = cartId({ slug, productoSlug });
  writeCart(readCart().filter((i) => cartId(i) !== id));
}

export function setQuantity(slug: string, productoSlug: string, cantidad: number): void {
  const id = cartId({ slug, productoSlug });
  const cart = readCart();
  if (cantidad <= 0) {
    writeCart(cart.filter((i) => cartId(i) !== id));
    return;
  }
  const item = cart.find((i) => cartId(i) === id);
  if (!item) return;
  item.cantidad = cantidad;
  writeCart(cart);
}

export function getTotal(cart: CartItem[] = readCart()): number {
  return cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

export function clearCart(): void {
  writeCart([]);
}

export function buildWhatsAppMessage(cart: CartItem[], nota: string): string {
  const lineas = cart.map(
    (item) => `- ${item.nombre} x${item.cantidad} — RD$ ${(item.precio * item.cantidad).toLocaleString('es-DO')}`
  );
  const partes = ['Hola! Quiero hacer este pedido:', '', ...lineas, '', `Total: RD$ ${getTotal(cart).toLocaleString('es-DO')}`];
  const notaLimpia = nota.trim();
  if (notaLimpia) {
    partes.push('', `Notas: ${notaLimpia}`);
  }
  return partes.join('\n');
}

if (typeof document !== 'undefined') {
  const updateBadge = () => {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = getCart().reduce((sum, item) => sum + item.cantidad, 0);
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
  };

  // #cart-toggle is a plain <a href="/carrito"> link now — no click
  // wiring needed here, the browser just navigates.
  window.addEventListener('cart:change', updateBadge);
  updateBadge();
}
