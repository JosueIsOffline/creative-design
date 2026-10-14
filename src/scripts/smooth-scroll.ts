import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// Site-wide smooth scrolling. Lenis drives the real window scroll, so
// native scroll listeners (motion's scroll(), GSAP ScrollTrigger) keep
// working. Module scripts run once, which is what we want: one instance
// survives Astro's client-side page swaps; each new page starts at the top.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const lenis = new Lenis({ autoRaf: true, lerp: 0.1 });
  document.addEventListener('astro:after-swap', () => lenis.scrollTo(0, { immediate: true }));
}
