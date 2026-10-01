import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitChars, splitWords } from './split-text';

gsap.registerPlugin(ScrollTrigger);

let mm: gsap.MatchMedia | undefined;

// Astro's ClientRouter keeps this module alive across client-side
// navigations (e.g. switching catalog categories), so the identical
// <script> import on every page only runs once. Re-running setup on
// every astro:page-load (which also fires on the very first load)
// picks up the freshly-swapped DOM instead of only ever seeing the
// first page's elements.
function setup() {
  mm?.revert();
  mm = gsap.matchMedia();

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

    // Word-grained version of the same blur reveal, for longer passages
    // (a manifesto paragraph) where a per-character stagger would drag on.
    document.querySelectorAll<HTMLElement>('[data-gsap="kinetic-paragraph"]').forEach((el) => {
      const words = splitWords(el);
      gsap.from(words, {
        opacity: 0,
        y: 10,
        filter: 'blur(8px)',
        stagger: 0.025,
        duration: 0.6,
        ease: 'power1.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });
    });
  });
}

document.addEventListener('astro:page-load', setup);
