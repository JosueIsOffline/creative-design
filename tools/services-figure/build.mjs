// Four iso scenes for the hero story, one per design service, drawn in the
// same kit and at about the press's scale. Every assembly is its own
// [data-part] group; the site floats them apart and brings them home on
// scroll (HeroScene.astro), using the press's AXES — close enough for
// offsets. Colour comes from the brand palette (the cursor's lilac, pink,
// yellow and cyan) by re-pointing the kit's "lit" variables per group.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 720;
const HEIGHT = 480;
const P = k.fitProjection(k.boxCorners({ x: -130, y: -75, w: 260, d: 150 }, -7, 150), WIDTH, HEIGHT, { pad: 34, azimuth: 42 });

// [top, side, face, edge]
const C = {
  lilac: ['#d9a8d9', '#a77fae', '#8a6693', '#f3dcf4'],
  pink: ['#e86a9f', '#b44a78', '#963d64', '#f8b3cf'],
  yellow: ['#f2cf4a', '#c2a22c', '#a08523', '#fcea9f'],
  cyan: ['#5ec8e8', '#3b97b3', '#2f7d95', '#b0e9f7'],
  paper: ['#ebe5ed', '#bbb3bf', '#a097a5', '#ffffff'],
  ink: ['#2c2631', '#221d27', '#1b171f', '#4d4553'],
  steel: ['#9a94a0', '#6e6874', '#5a5560', '#d6d0db'],
};
const INK = '#1d1921';
const SOFT = '#8c8491';

const part = (name, ...body) => `<g data-part="${name}">${body.join('')}</g>`;
const tint = (c, body) => `<g style="--anatomy-lit-top:${c[0]};--anatomy-lit-shade:${c[1]};--anatomy-face:${c[2]};--anatomy-lit:${c[3]}">${body}</g>`;
const solid = (c, paths, bevel = true) => tint(c, k.solidSvg(paths, { tone: 'hi', lit: true, crease: bevel ? 'faint' : 'none' }));

// Plan helpers: a rounded rect rotated about its centre (deg, in plan).
const rot = ([x, y], deg, [cx, cy]) => {
  const a = (deg * Math.PI) / 180, dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
};
const box = (cx, cy, w, d, r = 2, deg = 0) => k.roundedPlan({ x: cx - w / 2, y: cy - d / 2, w, d, r }, 6).map((p) => rot(p, deg, [cx, cy]));
const slab = (ring, z, h, bevel = 0.4) => k.extrude(ring, z, h, P, { convex: true, bevel });
// Local (u, v) on a rotated sheet → plan, u/v from the sheet's top-left.
const local = (cx, cy, w, d, deg) => (u, v) => rot([cx - w / 2 + u, cy - d / 2 + v], deg, [cx, cy]);

const txt = (xy, z, deg, s, { size = 6, fill = INK, weight = 700, family = "'Parkinsans', sans-serif", anchor = 'middle', spacing = 0 } = {}) =>
  `<text transform="${k.topMatrix(xy, z, P, 'x')} rotate(${deg})" font-size="${size}" fill="${fill}" font-family="${family}" font-weight="${weight}" letter-spacing="${spacing}" text-anchor="${anchor}" dominant-baseline="middle">${s}</text>`;
const flat = (pts, z, fill) => `<path d="${k.onTop(pts, z, P, true)}" fill="${fill}" stroke="none"/>`;
const line = (a, b, z, stroke = SOFT, width = 1.4) => `<path d="${k.onTop([a, b], z, P)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`;
const circle = (cx, cy, r, z, fill) => flat(k.circleRing(cx, cy, r, 36), z, fill);
// Text lines on a rotated sheet.
const rows = (L, z, u, v, w, n, gap, stroke = SOFT) =>
  Array.from({ length: n }, (_, i) => line(L(u, v + i * gap), L(u + w * (i === n - 1 ? 0.55 : 1), v + i * gap), z, stroke)).join('');

// The brand's cursor mark (from the hero's "a"), as a plan polygon.
const cursor = (L, u, v, s) => [[4, 12], [11.07, 29], [13.58, 21.61], [21, 19.07]].map(([x, y]) => L(u + (x - 4) * s, v + (y - 12) * s));

function identidad() {
  const out = [];
  const board = box(0, 0, 252, 146, 14);
  out.push(part('board',
    `<path class="iso-halo" d="${slab(board, -2, 2).fill}"/>`,
    solid(C.ink, slab(board, 0, 9, 1.4)),
    `<path d="${k.onTop(box(0, 0, 238, 132, 9), 9.05, P, true)}" fill="none" stroke="#3d3543" stroke-width="1"/>`,
    txt([-112, 58], 9.1, 0, 'BRAND KIT · CD', { size: 4.2, fill: '#6e6475', anchor: 'start', spacing: 1.2, weight: 600 }),
  ));
  // Construction: the circles and axes the mark is built on.
  const M = [-56, -12];
  out.push(part('guides',
    `<path d="${k.ring(M[0], M[1], 58, 9.2, P, 64)}" fill="none" stroke="#6b5a72" stroke-width="1" stroke-dasharray="3 4"/>`,
    `<path d="${k.ring(M[0], M[1], 42, 9.2, P, 64)}" fill="none" stroke="#54475a" stroke-width="1" stroke-dasharray="2 3"/>`,
    line([M[0] - 66, M[1]], [M[0] + 66, M[1]], 9.2, '#4b3f51', 1),
    line([M[0], M[1] - 64], [M[0], M[1] + 64], 9.2, '#4b3f51', 1),
    line([M[0] - 30, M[1] - 30], [M[0] + 30, M[1] + 30], 9.2, '#3f3545', 1),
    [[-58, 0], [58, 0], [0, -58], [0, 58]].map(([dx, dy]) => circle(M[0] + dx, M[1] + dy, 2, 9.25, '#d9a8d9')).join(''),
  ));
  // The mark: a raised lilac tile with the monogram and the cursor.
  const tile = box(M[0], M[1], 70, 70, 16);
  const T = local(M[0], M[1], 70, 70, 0);
  out.push(part('mark',
    solid(C.lilac, slab(tile, 9, 16, 2)),
    txt(T(30, 37), 25.1, 0, 'CD', { size: 27, fill: INK, spacing: -1.5 }),
    flat(cursor(T, 49, 12, 0.95), 25.15, INK),
  ));
  // A swatch fan, pinned at one end like a printer's colour guide.
  const pivot = [26, 58];
  const chips = [[-34, C.pink], [-16, C.yellow], [2, C.cyan], [20, C.lilac]];
  out.push(part('swatches', chips.map(([deg, c], i) => {
    const cx = pivot[0], cy = pivot[1] - 30, z = 9 + i * 1.4;
    const ring = box(cx, cy, 20, 66, 2).map((p) => rot(p, deg, pivot));
    const L = (u, v) => rot([cx - 10 + u, cy - 33 + v], deg, pivot);
    const swatch = [L(0, 0), L(20, 0), L(20, 34), L(0, 34)];
    return solid(C.paper, slab(ring, z, 1.2, 0.2), false)
      + flat(swatch, z + 1.25, c[0])
      + line(L(3, 42), L(15, 42), z + 1.25, '#8c8491', 1.2) + line(L(3, 47), L(11, 47), z + 1.25, '#b5adb9', 1.2);
  }).join(''),
    solid(C.steel, k.cylinder(pivot[0], pivot[1] - 6, 3.6, 9, 8, P, 20, 0.6)),
  ));
  // Type specimen card.
  const tc = [84, -32], TL = local(tc[0], tc[1], 76, 56, 0);
  out.push(part('type',
    solid(C.paper, slab(box(tc[0], tc[1], 76, 56, 3), 9, 1.6, 0.3), false),
    txt(TL(22, 28), 10.7, 0, 'Aa', { size: 26, fill: INK }),
    txt(TL(46, 13), 10.7, 0, 'PARKINSANS', { size: 4, fill: '#6e6475', anchor: 'start', weight: 600, spacing: 0.6 }),
    rows(TL, 10.7, 46, 24, 22, 4, 7),
    flat([TL(46, 47), TL(52, 47), TL(52, 53), TL(46, 53)], 10.75, C.lilac[0]),
    flat([TL(54, 47), TL(60, 47), TL(60, 53), TL(54, 53)], 10.75, INK),
  ));
  // A pencil lying across the board.
  const pc = [-4, 54], deg = -58, PL = local(pc[0], pc[1], 7, 84, deg);
  out.push(part('pencil',
    solid(C.yellow, slab(box(pc[0], pc[1], 7, 70, 1.5, deg), 9, 6.5, 0.6)),
    solid(C.pink, slab([PL(0, 77), PL(7, 77), PL(7, 84), PL(0, 84)], 9.2, 6, 0.5)),
    flat([PL(0, 7), PL(7, 7), PL(3.5, -4)], 15.6, '#e7c9a6'),
    flat([PL(2.2, 0), PL(4.8, 0), PL(3.5, -4)], 15.7, INK),
  ));
  return out;
}

// One printed flyer on a rotated sheet: colour block with a disc and a big
// headline, body lines, and a footer strip with the monogram.
function flyer(cx, cy, deg, z, c, accent, title, sub) {
  const w = 62, d = 90, L = local(cx, cy, w, d, deg);
  const quad = (u0, v0, u1, v1) => [L(u0, v0), L(u1, v0), L(u1, v1), L(u0, v1)];
  const top = z + 1.2;
  const [dx, dy] = L(44, 20);
  return solid(C.paper, slab(box(cx, cy, w, d, 2, deg), z, 1.2, 0.2), false)
    + flat(quad(4, 4, w - 4, 52), top + 0.02, c[0])
    + flat(k.circleRing(dx, dy, 13, 36), top + 0.04, accent[0])
    + txt(L(6, 40), top + 0.06, deg, title, { size: 15, fill: INK, anchor: 'start', spacing: -0.8 })
    + txt(L(6, 48), top + 0.06, deg, sub, { size: 3.6, fill: INK, anchor: 'start', weight: 600, spacing: 0.8 })
    + rows(L, top + 0.05, 6, 60, 46, 3, 6)
    + flat(quad(4, 80, w - 4, 86), top + 0.05, INK)
    + txt(L(w - 8, 83), top + 0.08, deg, 'CD', { size: 4, fill: C.lilac[0], anchor: 'end' });
}

function flyers() {
  const out = [];
  // The print run: a squared-off pile at the back.
  const pile = [];
  for (let i = 0; i < 7; i++) pile.push(solid(C.paper, slab(box(58, -34, 62, 90, 2, 4 + (i % 3) - 1), i * 1.3, 1.2, 0.2), false));
  out.push(part('stack', ...pile, flyer(58, -34, 4, 9.1, C.cyan, C.yellow, 'NEW', 'COLECCIÓN 2026')));
  out.push(part('flyer0', flyer(-84, -14, -14, 0, C.pink, C.yellow, 'SALE', 'SOLO ESTE FINDE')));
  out.push(part('flyer1', flyer(-22, 14, -3, 2, C.yellow, C.pink, '50%', 'EN TODA LA TIENDA')));
  out.push(part('flyer2', flyer(42, 40, 9, 4, C.lilac, C.cyan, '2×1', 'TAZAS Y VASOS')));
  return out;
}

function papeleria() {
  const out = [];
  // Letterhead.
  const lc = [-66, -6], ld = -6, LL = local(lc[0], lc[1], 90, 128, ld);
  const quad = (L, u0, v0, u1, v1) => [L(u0, v0), L(u1, v0), L(u1, v1), L(u0, v1)];
  out.push(part('letter',
    solid(C.paper, slab(box(lc[0], lc[1], 90, 128, 2, ld), 0, 1.2, 0.2), false),
    flat(quad(LL, 0, 0, 90, 5), 1.25, C.lilac[0]),
    txt(LL(8, 16), 1.3, ld, 'CD', { size: 10, fill: INK, anchor: 'start', spacing: -0.6 }),
    txt(LL(24, 15), 1.3, ld, 'Creative Design', { size: 4.2, fill: INK, anchor: 'start', weight: 600 }),
    txt(LL(24, 20), 1.3, ld, 'by Ailyn Japa', { size: 3.4, fill: '#7a7080', anchor: 'start', weight: 500 }),
    rows(LL, 1.25, 60, 13, 22, 3, 4, '#b5adb9'),
    rows(LL, 1.25, 8, 38, 74, 9, 7),
    `<path d="${k.onTop([LL(10, 108), LL(16, 103), LL(20, 110), LL(26, 102), LL(31, 109), LL(36, 104)], 1.3, P)}" fill="none" stroke="${C.lilac[1]}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  ));
  // Envelope with its flap and a wax seal.
  const ec = [46, -30], edeg = 7, EL = local(ec[0], ec[1], 118, 66, edeg);
  out.push(part('envelope',
    solid(C.paper, slab(box(ec[0], ec[1], 118, 66, 2.5, edeg), 0, 3, 0.4), false),
    flat([EL(1, 1), EL(117, 1), EL(59, 40)], 3.05, '#d6cfd9'),
    `<path d="${k.onTop([EL(1, 1), EL(59, 40), EL(117, 1)], 3.1, P)}" fill="none" stroke="#a097a5" stroke-width="1"/>`,
    solid(C.lilac, k.cylinder(...EL(59, 40), 9, 3.05, 2.2, P, 32, 0.6)),
    txt(EL(59, 40), 5.4, edeg, 'CD', { size: 6.5, fill: INK, spacing: -0.4 }),
    txt(EL(74, 54), 3.1, edeg, 'PARA: TÚ', { size: 4, fill: '#7a7080', anchor: 'start', weight: 600, spacing: 0.6 }),
  ));
  // Business cards: a stack, and the top one turned lilac side up.
  const cc = [62, 44];
  const stack = [];
  for (let i = 0; i < 5; i++) stack.push(solid(C.paper, slab(box(cc[0], cc[1], 58, 34, 2, -3 + i * 0.8), i * 1.1, 0.9, 0.1), false));
  const tc = [cc[0] - 10, cc[1] + 8], tdeg = 16, TL = local(tc[0], tc[1], 58, 34, tdeg);
  out.push(part('cards', ...stack,
    rows(local(cc[0], cc[1], 58, 34, 0.2), 5.45, 22, 14, 28, 3, 5),
    solid(C.lilac, slab(box(tc[0], tc[1], 58, 34, 2, tdeg), 5.5, 1, 0.1), false),
    txt(TL(29, 15), 6.55, tdeg, 'CD', { size: 12, fill: INK, spacing: -0.8 }),
    txt(TL(29, 26), 6.55, tdeg, 'CREATIVE DESIGN', { size: 3.4, fill: INK, weight: 600, spacing: 0.8 }),
  ));
  // A pen.
  const pc = [-10, 58], pdeg = -64, PL = local(pc[0], pc[1], 7, 86, pdeg);
  out.push(part('pen',
    solid(C.ink, slab(box(pc[0], pc[1], 7, 86, 3.5, pdeg), 0, 7, 0.8)),
    solid(C.lilac, slab([PL(0, 60), PL(7, 60), PL(7, 84), PL(0, 84)], 0.2, 7.2, 0.8)),
    line(PL(3.5, 62), PL(3.5, 80), 7.6, C.lilac[3], 1.2),
    flat([PL(1.5, 0), PL(5.5, 0), PL(3.5, -6)], 3.6, C.steel[0]),
  ));
  return out;
}

function personalizacion() {
  const out = [];
  // A tee laid flat, cyan, with a lilac print on the chest.
  const tc = [-80, -14], s = 0.95;
  const T = ([u, v]) => [tc[0] + u * s, tc[1] + v * s];
  const tee = [[-14, -55], [-8, -48], [0, -46], [8, -48], [14, -55], [40, -50], [60, -27], [46, -16], [34, -24], [34, 52], [-34, 52], [-34, -24], [-46, -16], [-60, -27], [-40, -50]].map(T).reverse();
  out.push(part('tee',
    `<path class="iso-halo" d="${k.extrude(tee, -1, 1, P, { convex: false }).fill}"/>`,
    tint(C.cyan, k.solidSvg(k.extrude(tee, 0, 3, P, { convex: false, bevel: 0.4 }), { tone: 'hi', lit: true, crease: 'none' })),
    `<path d="${k.onTop([[-14, -55], [-8, -48], [0, -46], [8, -48], [14, -55]].map(T), 3.1, P)}" fill="none" stroke="${C.cyan[2]}" stroke-width="2"/>`,
    flat([[-20, -26], [20, -26], [20, 14], [-20, 14]].map(T), 3.1, C.lilac[0]),
    txt(T([0, -6]), 3.2, 0, 'CD', { size: 17, fill: INK, spacing: -1 }),
  ));
  // Phone case, yellow, camera bump and a round sticker.
  const ph = [72, -40];
  const PL = local(ph[0], ph[1], 48, 94, 0);
  out.push(part('case',
    solid(C.yellow, slab(box(ph[0], ph[1], 48, 94, 11), 0, 7, 1.4)),
    solid(C.ink, slab(box(...PL(15, 15), 22, 22, 6), 7, 2, 0.5)),
    `<path d="${k.ring(...PL(10, 10), 3.2, 9.1, P, 24)}" fill="#111" stroke="${C.steel[0]}" stroke-width="1"/>`,
    `<path d="${k.ring(...PL(20, 20), 3.2, 9.1, P, 24)}" fill="#111" stroke="${C.steel[0]}" stroke-width="1"/>`,
    circle(...PL(24, 60), 12, 7.05, C.pink[0]),
    txt(PL(24, 60), 7.1, 0, 'CD', { size: 9, fill: INK, spacing: -0.5 }),
  ));
  // The mug: white, a pink print wrapped round it, handle to the right.
  const mx = 46, my = 22, mr = 25, mh = 62;
  const handle = k.sideRing([mx + mr + 9, my, mh * 0.5], 17, 'y', P, 36);
  // The band's own top cap would show inside the mug, so the rim above it
  // and the handle are drawn again over the print.
  const rim = [
    solid(C.paper, k.cylinder(mx, my, mr, mh * 0.72, mh * 0.28, P, 48, 1.4)),
    circle(mx, my, mr - 3, mh + 0.05, C.ink[1]),
    `<path d="${k.ring(mx, my, mr - 3, mh + 0.06, P, 48)}" fill="none" stroke="#c9c1cd" stroke-width="1"/>`,
    `<path d="${handle}" fill="none" stroke="${C.paper[2]}" stroke-width="10" stroke-linecap="round"/>`,
    `<path d="${handle}" fill="none" stroke="${C.paper[0]}" stroke-width="6.5" stroke-linecap="round"/>`,
  ].join('');
  out.push(part('mug',
    `<path class="iso-halo" d="${k.cylinder(mx, my, mr + 2, -2, 2, P, 48).fill}"/>`,
    solid(C.paper, k.cylinder(mx, my, mr, 0, mh, P, 48, 1.4)),
    rim,
  ));
  out.push(part('print',
    solid(C.pink, k.cylinder(mx, my, mr + 0.5, mh * 0.24, mh * 0.48, P, 48, 0), false),
    `<text transform="${k.sideMatrix([mx, my + mr + 0.6], mh * 0.36, P, 'left')}" font-size="15" fill="${INK}" font-family="'Parkinsans', sans-serif" font-weight="700" text-anchor="middle">CD</text>`,
    rim,
  ));
  // Acrylic keychain: a lilac tag on a steel ring.
  const kc = [-16, 58], kdeg = 22, KL = local(kc[0], kc[1], 30, 40, kdeg);
  out.push(part('keychain',
    `<path d="${k.ring(...KL(15, -8), 9, 1.4, P, 32)}" fill="none" stroke="${C.steel[0]}" stroke-width="2.4"/>`,
    solid(C.lilac, slab(box(kc[0], kc[1], 30, 40, 9, kdeg), 0, 3, 0.6)),
    circle(...KL(15, 6), 3, 3.05, INK),
    txt(KL(15, 24), 3.1, kdeg, 'CD', { size: 10, fill: INK, spacing: -0.5 }),
  ));
  return out;
}

const scenes = {
  identidad: ['Identidad visual: un logo construido sobre su retícula, con su guía de color, su tipografía y un lápiz.', identidad()],
  flyers: ['Flyers: un tiraje impreso y tres diseños abiertos en abanico.', flyers()],
  papeleria: ['Papelería: hoja membretada, sobre con sello de cera, tarjetas de presentación y un bolígrafo.', papeleria()],
  personalizacion: ['Personalización: una camiseta, una funda de teléfono, una taza con su diseño impreso y un llavero.', personalizacion()],
};
for (const [name, [label, body]] of Object.entries(scenes)) {
  writeFileSync(join(HERE, `${name}.svg`), k.figureSvg({ width: WIDTH, height: HEIGHT, label, body }));
}
console.log('wrote', Object.keys(scenes).join(', '));
