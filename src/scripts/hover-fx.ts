import gsap from 'gsap';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Re-mounts on every astro:page-load (not just the first) so freshly
// swapped-in content after a client-side navigation gets wired too — see
// micro-interactions.ts for why the per-element marker is needed.
function mount() {
  if (reducedMotion()) return;
  document.querySelectorAll<HTMLElement>('.js-hover-fx').forEach((el) => {
    if (el.dataset.hoverFxMounted) return;
    el.dataset.hoverFxMounted = 'true';

    const target = el.querySelector<SVGElement>('svg') ?? el;
    const tl = gsap.timeline({ paused: true }).to(target, {
      scale: 1.2,
      duration: 0.25,
      ease: 'back.out(3)',
    });
    el.addEventListener('mouseenter', () => tl.play());
    el.addEventListener('mouseleave', () => tl.reverse());
  });
}

document.addEventListener('astro:page-load', mount);
