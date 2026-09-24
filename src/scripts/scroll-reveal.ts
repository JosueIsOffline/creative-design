import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

document.querySelectorAll('.product-card, .valor-card, .service-card').forEach((card) => {
  gsap.from(card, {
    opacity: 0,
    y: 30,
    duration: 0.6,
    scrollTrigger: {
      trigger: card,
      start: 'top 85%',
    },
  });
});
