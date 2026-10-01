import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitWords } from './split-text';

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
    const words = splitWords(heading);
    gsap.from(words, {
      opacity: 0,
      y: 16,
      stagger: 0.04,
      duration: 0.4,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: heading,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });
});
