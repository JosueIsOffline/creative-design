import gsap from 'gsap';

const mm = gsap.matchMedia();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  document.querySelectorAll<HTMLElement>('.js-hover-fx').forEach((el) => {
    const target = el.querySelector<SVGElement>('svg') ?? el;
    const tl = gsap.timeline({ paused: true }).to(target, {
      scale: 1.2,
      duration: 0.25,
      ease: 'back.out(3)',
    });
    el.addEventListener('mouseenter', () => tl.play());
    el.addEventListener('mouseleave', () => tl.reverse());
  });
});
