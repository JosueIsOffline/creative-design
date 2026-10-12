import gsap from 'gsap';

const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Magnetic pull: the element leans toward the pointer while hovered, springs back on leave.
function magnetic(el: HTMLElement, pull = 0.3) {
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    gsap.to(el, {
      x: (e.clientX - r.left - r.width / 2) * pull,
      y: (e.clientY - r.top - r.height / 2) * pull,
      duration: 0.3,
      ease: 'power3.out',
    });
  };
  const reset = () => gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', reset);
}

// 3D tilt toward the pointer's position within the element.
function tilt(el: HTMLElement, max = 6) {
  gsap.set(el, { transformPerspective: 600 });
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(el, { rotateY: x * max, rotateX: -y * max, duration: 0.3, ease: 'power3.out' });
  };
  const reset = () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'power2.out' });
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', reset);
}

// Hover lift: the element springs up a few px under the pointer.
function lift(el: HTMLElement, y = -4) {
  const enter = () => gsap.to(el, { y, duration: 0.3, ease: 'power3.out' });
  const leave = () => gsap.to(el, { y: 0, duration: 0.3, ease: 'power3.out' });
  el.addEventListener('pointerenter', enter);
  el.addEventListener('pointerleave', leave);
}

// Pointer spotlight: keeps --mx / --my at the pointer position for a CSS radial-gradient glow.
function spot(el: HTMLElement) {
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  el.addEventListener('pointermove', move);
}

// Astro's ClientRouter keeps this module alive across client-side
// navigations, and persisted chrome (header) keeps the same DOM nodes —
// the data-mounted marker stops a persisted element from accumulating a
// fresh set of listeners every time astro:page-load fires, while freshly
// swapped-in content (a new catalog page's product cards) still gets wired.
function wire(selector: string, fn: (el: HTMLElement) => void) {
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (el.dataset.microMounted) return;
    el.dataset.microMounted = 'true';
    fn(el);
  });
}

function mount() {
  if (reducedMotion() || !finePointer()) return;
  wire('[data-magnetic]', (el) => magnetic(el));
  wire('[data-tilt]', (el) => tilt(el));
  wire('[data-lift]', (el) => lift(el));
  wire('[data-spot]', (el) => spot(el));
}

document.addEventListener('astro:page-load', mount);
