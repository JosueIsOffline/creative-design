import { animate } from 'motion';
import { addItem, type CartItem } from './cart';

// Adding to the cart, in four beats (< 1s, never blocking):
// 1. the button presses and becomes a lilac circle with a ✓;
// 2. a copy of the product photo flies in an arc to the header's cart icon,
//    shrinking on the way;
// 3. the icon catches it (a bounce) and the badge rolls to the new count —
//    held back until then, so the number changes when the piece lands;
// 4. a pinch of confetti in the cursor's colours bursts from the cart.
// Reduced motion: the ✓ and the badge update, no flight, no confetti.

const CONFETTI = ['#d9a8d9', '#e85fa0', '#f7d842', '#5ec8e8'];
const CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function addToCartWithFx(button: HTMLElement, item: Omit<CartItem, 'cantidad'>) {
  const badge = document.getElementById('cart-badge');
  const before = badge ? { text: badge.textContent, hidden: badge.classList.contains('hidden') } : null;
  addItem(item);
  morphButton(button);
  if (reduce() || !badge || !before) return;

  // Hold the badge at its old value until the piece lands.
  const after = { text: badge.textContent, hidden: badge.classList.contains('hidden') };
  badge.textContent = before.text;
  badge.classList.toggle('hidden', before.hidden);

  // The header pill hides while scrolling down — bring it back so the cart
  // is there to catch the piece.
  document.getElementById('site-header')?.classList.remove('is-away');
  const cart = document.getElementById('cart-toggle');
  const source = sourceImage(button);
  fly(source, item.foto, cart).then(() => {
    badge.textContent = after.text;
    badge.classList.toggle('hidden', after.hidden);
    animate(badge, { y: [-10, 0], opacity: [0, 1], scale: [0.6, 1] }, { type: 'spring', bounce: 0.45, duration: 0.5 });
    if (cart) {
      animate(cart, { scale: [1, 1.28, 1] }, { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] });
      confetti(cart);
    }
  });
}

// The product photo nearest the button: the card's own image, or the
// product page's main image.
function sourceImage(button: HTMLElement): HTMLImageElement | null {
  const scope = button.closest('[data-product-trigger]') ?? button.closest('main') ?? document;
  return scope.querySelector<HTMLImageElement>('img');
}

function morphButton(button: HTMLElement) {
  if (button.dataset.fxBusy) return;
  button.dataset.fxBusy = '1';
  const w = button.offsetWidth, h = button.offsetHeight;
  const kids = [...button.children] as HTMLElement[];
  const check = document.createElement('span');
  check.className = 'cart-fx-check';
  check.innerHTML = CHECK;
  const restore = () => {
    check.remove();
    kids.forEach((k) => (k.style.visibility = ''));
    button.classList.remove('is-added');
    button.style.width = button.style.height = '';
    delete button.dataset.fxBusy;
  };
  if (reduce()) {
    button.style.width = `${w}px`;
    button.style.height = `${h}px`;
    button.classList.add('is-added');
    kids.forEach((k) => (k.style.visibility = 'hidden'));
    button.append(check);
    setTimeout(restore, 1200);
    return;
  }
  // Pin both sides so it can shrink to a circle (the hidden label would
  // otherwise wrap and stretch it tall), then swap the content.
  button.style.width = `${w}px`;
  button.style.height = `${h}px`;
  kids.forEach((k) => (k.style.visibility = 'hidden'));
  button.classList.add('is-added');
  button.append(check);
  animate(button, { width: [`${w}px`, `${h}px`] }, { duration: 0.35, ease: [0.16, 1, 0.3, 1] });
  animate(check, { scale: [0.3, 1], opacity: [0, 1], rotate: [-25, 0] }, { type: 'spring', bounce: 0.5, duration: 0.5, delay: 0.12 });
  setTimeout(() => {
    animate(check, { scale: 0.4, opacity: 0 }, { duration: 0.15 });
    animate(button, { width: [`${h}px`, `${w}px`] }, { duration: 0.4, ease: [0.16, 1, 0.3, 1] }).then(restore);
  }, 1300);
}

// A copy of the photo, flown along a quadratic arc from the card to the cart.
function fly(source: HTMLImageElement | null, foto: string, cart: HTMLElement | null): Promise<void> {
  // Read the cart's position every frame: the header may still be sliding in.
  const target = () => {
    const to = cart?.getBoundingClientRect();
    return to && to.width ? { x: to.left + to.width / 2, y: to.top + to.height / 2 } : { x: innerWidth - 40, y: 40 };
  };
  const r = source?.getBoundingClientRect();
  const size = r ? Math.min(140, r.width * 0.6) : 90;
  const from = r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };

  const img = document.createElement('img');
  img.src = source?.currentSrc || foto;
  img.alt = '';
  img.className = 'cart-fx-fly';
  img.style.width = img.style.height = `${size}px`;
  document.body.append(img);

  // The arc rises first, then sweeps across to the cart — kept on screen
  // (the cart sits near the top edge, so a higher arc would leave it).
  const D = 750, t0 = performance.now();
  return new Promise((resolve) => {
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / D);
      const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
      const to = target();
      const c = { x: from.x + (to.x - from.x) * 0.2, y: Math.max(16, to.y - 24) };
      const x = (1 - e) ** 2 * from.x + 2 * (1 - e) * e * c.x + e ** 2 * to.x;
      const y = (1 - e) ** 2 * from.y + 2 * (1 - e) * e * c.y + e ** 2 * to.y;
      const s = 1 - e * (1 - 18 / size); // ends about the icon's size
      img.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px) scale(${s}) rotate(${e * 18}deg)`;
      img.style.opacity = String(k < 0.85 ? 1 : 1 - (k - 0.85) / 0.15);
      if (k < 1) requestAnimationFrame(step);
      else { img.remove(); resolve(); }
    };
    requestAnimationFrame(step);
  });
}

function confetti(cart: HTMLElement) {
  const r = cart.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 12; i++) {
    const bit = document.createElement('span');
    bit.className = 'cart-fx-bit';
    bit.style.background = CONFETTI[i % CONFETTI.length];
    bit.style.left = `${cx}px`;
    bit.style.top = `${cy}px`;
    document.body.append(bit);
    const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4, d = 22 + Math.random() * 22;
    animate(
      bit,
      { x: [0, Math.cos(a) * d], y: [0, Math.sin(a) * d + 6], rotate: [0, (Math.random() - 0.5) * 360], opacity: [1, 0], scale: [1, 0.6] },
      { duration: 0.6 + Math.random() * 0.2, ease: [0.16, 1, 0.3, 1] }
    ).then(() => bit.remove());
  }
}
