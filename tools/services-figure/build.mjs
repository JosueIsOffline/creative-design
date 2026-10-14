// Four small iso scenes for the hero story, one per design service, drawn in
// the same kit and at the same scale as the heat press. Every assembly is its
// own [data-part] group; the site floats them apart and brings them home on
// scroll (HeroScene.astro). The site floats these parts with the press's
// AXES (heat-press-figure/figure-data.json) — close enough for offsets.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 720;
const HEIGHT = 480;

// Same footprint the press is fitted to, so the scenes read at its scale.
const P = k.fitProjection(k.boxCorners({ x: -130, y: -75, w: 260, d: 150 }, -7, 150), WIDTH, HEIGHT, { pad: 34, azimuth: 42 });

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const part = (name, body) => `<g data-part="${name}">${body}</g>`;
const text = (xy, z, s, opts) => k.faceTextSvg(k.topMatrix(xy, z, P, 'x'), s, opts);
const textLines = (plan, z, rows, from = 0.45) => {
  const out = [];
  for (let i = 0; i < rows; i++) {
    const y = plan.y + plan.d * (from + i * ((0.9 - from) / Math.max(1, rows)));
    const w = i === rows - 1 ? 0.45 : 0.75;
    out.push(L(k.lineOnTop([plan.x + plan.w * 0.12, y], [plan.x + plan.w * (0.12 + w * 0.76)], z, P), { tone: 'faint' }));
  }
  return out.join('');
};
// A sheet of paper with a lit header band, a monogram and body lines.
const sheet = (plan, z, { h = 1.4, mark = 'CD', rows = 3, size = 9 } = {}) => {
  const top = z + h;
  const band = { x: plan.x + 6, y: plan.y + 6, w: plan.w - 12, d: plan.d * 0.26, r: 2 };
  return [
    S(k.slabOf(plan, z, h, P, 3, 0.3), { tone: 'hi', crease: 'none' }),
    S(k.slabOf(band, top, 0.5, P, 2), { tone: 'hi', crease: 'none', lit: true }),
    text([band.x + band.w / 2, band.y + band.d / 2], top + 0.6, mark, { size, tone: 'lit', anchor: 'middle' }),
    textLines(plan, top, rows),
  ].join('');
};

function identidad() {
  const board = { x: -120, y: -70, w: 240, d: 140, r: 10 };
  const markPlan = { x: -95, y: -45, w: 90, d: 90, r: 14 };
  const out = [];
  out.push(part('board', S(k.slabOf(board, 0, 8, P, 8, 1), { tone: 'mid' }) + L(k.planOutline(k.insetPlan(board, 8), 8, P, 8), { tone: 'faint' })));
  // Construction grid: the circle and cross the mark is built on.
  out.push(part('grid', [
    L(k.ring(-50, 0, 52, 8.2, P, 48), { tone: 'lo', dashed: true }),
    L(k.lineOnTop([-110, 0], [10, 0], 8.2, P), { tone: 'faint', dashed: true }),
    L(k.lineOnTop([-50, -62], [-50, 62], 8.2, P), { tone: 'faint', dashed: true }),
  ].join('')));
  out.push(part('mark', S(k.slabOf(markPlan, 8, 14, P, 8, 1.2), { tone: 'hi', lit: true }) + text([-50, 0], 22.2, 'CD', { size: 26, tone: 'lit', anchor: 'middle' })));
  // The palette: three chips, light to dark.
  out.push(part('palette', ['hi', 'mid', 'lo'].map((tone, i) => S(k.slabOf({ x: 26 + i * 28, y: -50, w: 22, d: 22, r: 3 }, 8, 6 - i * 1.5, P, 3, 0.5), { tone, lit: i === 0 })).join('')));
  // Type specimen.
  out.push(part('type', S(k.slabOf({ x: 26, y: -12, w: 78, d: 58, r: 4 }, 8, 1.4, P, 3, 0.3), { tone: 'hi', crease: 'none' }) + text([46, 18], 9.6, 'Aa', { size: 22, tone: 'hi', anchor: 'middle' }) + textLines({ x: 60, y: -12, w: 44, d: 58 }, 9.6, 3, 0.3)));
  return out;
}

const FLYERS = [
  { x: -118, y: -48, r: 0 },
  { x: -54, y: -60, r: 0 },
  { x: 10, y: -52, r: 0 },
  { x: 74, y: -44, r: 0 },
].map((p, i) => ({ ...p, z: i * 0.01 }));
function flyers() {
  return FLYERS.map((f, i) => part(`flyer${i}`, sheet({ x: f.x, y: f.y, w: 56, d: 84, r: 2 }, 0, { mark: ['CD', '50%', 'SALE', '2×1'][i], rows: 4, size: [9, 9, 7.5, 9][i] })));
}

function papeleria() {
  const out = [];
  out.push(part('letter', sheet({ x: -120, y: -66, w: 92, d: 130, r: 2 }, 0, { rows: 6, size: 10 })));
  const env = { x: -12, y: -40, w: 128, d: 72, r: 3 };
  out.push(part('envelope', [
    S(k.slabOf(env, 0, 3, P, 3, 0.5), { tone: 'mid' }),
    L(k.onTop([[env.x + 2, env.y + 2], [env.x + env.w / 2, env.y + env.d * 0.55], [env.x + env.w - 2, env.y + 2]], 3.05, P), { tone: 'lo' }),
    S(k.cylinder(env.x + env.w / 2, env.y + env.d * 0.55, 7, 3, 1.6, P, 24, 0.3), { tone: 'hi', lit: true }),
  ].join('')));
  const card = { x: 6, y: 42, w: 64, d: 36, r: 2 };
  out.push(part('cards', [0, 1, 2].map((i) => S(k.slabOf(card, i * 1.4, 1.2, P, 2, 0.2), { tone: 'hi', crease: 'none' })).join('')
    + text([card.x + 14, card.y + card.d / 2], 4.3, 'CD', { size: 8, tone: 'lit', anchor: 'middle' })
    + textLines({ ...card, x: card.x + 22, w: card.w - 22 }, 4.2, 2, 0.4)));
  return out;
}

function personalizacion() {
  const out = [];
  const mx = -40, my = 0, mr = 34, mh = 86;
  // Handle: a fat loop on the mug's right side, drawn as two strokes.
  const handle = k.sideRing([mx, my + mr + 12, mh * 0.55], 18, 'x', P, 28);
  out.push(part('mug', [
    `<path class="iso-line" data-tone="mid" data-free style="stroke-width:7" d="${handle}"/>`,
    S(k.cylinder(mx, my, mr, 0, mh, P, 48, 1.2), { tone: 'hi' }),
    L(k.ring(mx, my, mr - 3, mh, P, 48), { tone: 'faint' }),
  ].join('')));
  // The print wrapped round the mug: a lit band just proud of the wall.
  out.push(part('print', S(k.cylinder(mx, my, mr + 0.4, mh * 0.28, mh * 0.42, P, 48), { tone: 'hi', lit: true, crease: 'none' })
    + k.faceTextSvg(k.sideMatrix([mx + mr * 0.2, my + mr * 0.98], mh * 0.42, P, 'right'), 'CD', { size: 15, tone: 'lit', anchor: 'middle' })));
  const phone = { x: 40, y: -70, w: 46, d: 92, r: 9 };
  out.push(part('case', [
    S(k.slabOf(phone, 0, 6, P, 8, 1), { tone: 'mid' }),
    S(k.slabOf({ x: phone.x + 6, y: phone.y + 6, w: 16, d: 16, r: 4 }, 6, 1.6, P, 4, 0.3), { tone: 'lo' }),
    text([phone.x + phone.w / 2, phone.y + phone.d * 0.62], 6.1, 'CD', { size: 12, tone: 'lit', anchor: 'middle' }),
  ].join('')));
  const tag = { x: 50, y: 36, w: 30, d: 38, r: 8 };
  out.push(part('keychain', [
    S(k.slabOf(tag, 0, 3, P, 6, 0.6), { tone: 'hi', lit: true }),
    L(k.ring(tag.x + tag.w / 2, tag.y - 8, 8, 1.5, P, 24), { tone: 'mid' }),
    text([tag.x + tag.w / 2, tag.y + tag.d / 2 + 2], 3.1, 'CD', { size: 8, tone: 'lit', anchor: 'middle' }),
  ].join('')));
  return out;
}

const scenes = {
  identidad: ['Identidad visual: un logo construido sobre su retícula, con su paleta y su tipografía.', identidad()],
  flyers: ['Flyers: cuatro piezas impresas abiertas en abanico.', flyers()],
  papeleria: ['Papelería: hoja membretada, sobre sellado y tarjetas de presentación.', papeleria()],
  personalizacion: ['Personalización: una taza con su diseño impreso, una funda y un llavero.', personalizacion()],
};
for (const [name, [label, body]] of Object.entries(scenes)) {
  writeFileSync(join(HERE, `${name}.svg`), k.figureSvg({ width: WIDTH, height: HEIGHT, label, body }));
}
console.log('wrote', Object.keys(scenes).join(', '));
