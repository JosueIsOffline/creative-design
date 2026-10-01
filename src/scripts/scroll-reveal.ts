import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitChars } from './split-text';

gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  // .service-card is excluded here — Services.astro pins and reveals its
  // own cards as a scroll-scrubbed sequence instead of this generic fade.
  document.querySelectorAll('.product-card, .valor-card').forEach((card) => {
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
      y: 12,
      filter: 'blur(10px)',
      stagger: 0.015,
      duration: 0.45,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: heading,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });
});
