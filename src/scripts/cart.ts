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

export function parseCartJson(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

  document.getElementById('cart-toggle')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cart:open'));
  });

  window.addEventListener('cart:change', updateBadge);
  updateBadge();
}
