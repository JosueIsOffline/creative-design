// Everything you'd want to tweak lives here: brand colours, copy, and how
// long each scene runs. Scene components read from this file only.

export const brand = {
  bg: '#0d0d0c',
  fg: '#ffffff',
  lilac: '#d9a8d9',
  pink: '#e85fa0',
  yellow: '#f7d842',
  blue: '#5ec8e8',
  muted: '#a1a1aa',
  surface: '#1a1a1a',
  line: 'rgba(255,255,255,0.12)',
};

// Captions: wrap words in *stars* to give them the brand gradient.
export const copy = {
  name: 'Creative Design',
  signature: 'By Ailyn Japa',
  // Full-screen type beats: the first swaps word by word, the second builds.
  title1: ['Diseño.', 'Sublimación.', '*Personalización.*'],
  title2: ['Tu idea.', '*Hecha pieza.*'],
  captions: {
    hero: 'Diseño gráfico *y sublimación.*',
    story: 'Seis servicios. *Un solo lugar.*',
    product: 'Pide en *un clic.*',
    phone: 'Hecho para *tu celular.*',
    gallery: 'Detalles que *brillan.*',
    spray: 'Con un toque *creativo.*',
  },
  url: 'creativedesign.com',
  cta: 'Escríbenos por WhatsApp',
  instagram: '@creativedesign_byailynjapa',
};

// Frames at 30 fps, cut to a 120 bpm grid (one beat = 15 frames), so the
// edit has a pulse even without music. `cut` frames overlap neighbouring
// scenes where a dissolve is used (see Promo.tsx); hard cuts don't overlap.
// The footage scenes are speed-ramped to roughly these lengths — see the
// `SEGMENTS` in each scene file if you change one a lot.
export const BEAT = 15;
export const timing = {
  fps: 30,
  cut: 10,
  scenes: {
    intro: 6 * BEAT,
    title1: 6 * BEAT,
    hero: 9 * BEAT,
    story: 7 * BEAT,
    product: 12 * BEAT,
    phone: 7 * BEAT,
    gallery: 11 * BEAT,
    cta: 8 * BEAT,
    spray: 6 * BEAT,
    title2: 4 * BEAT,
    outro: 9 * BEAT,
  },
};
