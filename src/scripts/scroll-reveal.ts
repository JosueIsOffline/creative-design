import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitChars } from './split-text';

gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  // Services and About rows are editorial lists (hairline dividers, no card
  // box) revealed only through their kinetic-heading titles, not this fade.
  document.querySelectorAll('.product-card').forEach((card) => {
    gsap.from(card, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  document.querySelectorAll<HTMLElement>('[data-gsap="kinetic-heading"]').forEach((heading) => {
    const chars = splitChars(heading);
    gsap.from(chars, {
      opacity: 0,
      y: 8,
      filter: 'blur(14px)',
      stagger: 0.02,
      duration: 0.7,
      ease: 'power1.out',
      scrollTrigger: {
        trigger: heading,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });
});
