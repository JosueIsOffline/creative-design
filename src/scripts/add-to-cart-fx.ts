import { animate } from 'motion';
import { addItem, type CartItem } from './cart';

// Adding to the cart: the button becomes a lilac circle with a ✓ and the
// header badge pops to the new count. Reduced motion: the ✓, no motion.

const CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function addToCartWithFx(button: HTMLElement, item: Omit<CartItem, 'cantidad'>) {
  addItem(item);
  morphButton(button);
  const badge = document.getElementById('cart-badge');
  if (!reduce() && badge) animate(badge, { scale: [0.6, 1] }, { type: 'spring', bounce: 0.4, duration: 0.4 });
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
