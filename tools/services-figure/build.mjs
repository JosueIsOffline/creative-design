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
  const mug = mugSvg(46, 22, 25, 62);
  out.push(part('mug', mug.body));
  out.push(part('print', mug.print));
  out.push(part('steam', mug.steam));
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

// A heart outline in plan, centred on (cx, cy), pointing toward +v.
const heart = (L, cu, cv, size) => Array.from({ length: 40 }, (_, i) => {
  const t = (i / 40) * Math.PI * 2;
  const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return L(cu + (x * size) / 17, cv - (y * size) / 17);
});

function redes() {
  const out = [];
  // Upright panels floating over the phone, facing the viewer: drawn on the
  // y-facing plane (u right, v down from the top-left corner), with a darker
  // copy just behind for thickness.
  const plate = (x0, y, zTop, w, h, r, c, inner, thick = 2.4) =>
    `<g transform="${k.sideMatrix([x0, y - thick], zTop, P, 'left')}"><rect width="${w}" height="${h}" rx="${r}" fill="${c[2]}"/></g>`
    + `<g transform="${k.sideMatrix([x0, y], zTop, P, 'left')}"><rect width="${w}" height="${h}" rx="${r}" fill="${c[0]}" stroke="${c[3]}" stroke-width="0.6"/>${inner}</g>`;
  const tether = (x, y, z0, z1) => `<path d="${k.segment([x, y, z0], [x, y, z1], P)}" fill="none" stroke="#6e6475" stroke-width="1" stroke-dasharray="2 3"/>`
    + `<path d="${k.ring(x, y, 2.4, z1, P, 16)}" fill="${C.lilac[0]}" stroke="none"/>`;
  const HEART = (x, y, s, fill) => `<path transform="translate(${x} ${y}) scale(${s})" d="M5 9.5 C2 7.2 0 5.4 0 3.2 C0 1.3 1.4 0 3 0 C4 0 4.7 .5 5 1.3 C5.3 .5 6 0 7 0 C8.6 0 10 1.3 10 3.2 C10 5.4 8 7.2 5 9.5Z" fill="${fill}"/>`;

  out.push(part('post',
    tether(59, -46, 20, 0),
    plate(26, -46, 104, 66, 84, 5, C.paper, [
      `<circle cx="7" cy="7" r="3.2" fill="${C.lilac[0]}"/><rect x="13" y="5.6" width="24" height="2.8" rx="1.4" fill="#8c8491"/>`,
      `<rect x="3" y="13" width="60" height="46" rx="2" fill="${C.pink[0]}"/>`,
      `<circle cx="44" cy="26" r="8" fill="${C.yellow[0]}"/>`,
      `<path d="M3 59 L21 38 L33 50 L42 42 L63 59 Z" fill="${C.pink[2]}"/>`,
      HEART(4, 63, 0.9, C.pink[0]),
      `<circle cx="20" cy="67.4" r="3.6" fill="none" stroke="${INK}" stroke-width="1.2"/>`,
      `<rect x="4" y="74" width="50" height="2.4" rx="1.2" fill="#8c8491"/><rect x="4" y="79" width="30" height="2.4" rx="1.2" fill="#b5adb9"/>`,
    ].join('')),
  ));
  // The phone, lying on its back, showing a profile: avatar, name, stats,
  // and a 3×3 grid of posts in the brand colours.
  const pc = [-44, 4], pdeg = -8, W = 78, D = 146, PL = local(pc[0], pc[1], W, D, pdeg);
  const quad = (u0, v0, u1, v1) => [PL(u0, v0), PL(u1, v0), PL(u1, v1), PL(u0, v1)];
  const z = 7.05;
  const tiles = [C.pink, C.yellow, C.lilac, C.cyan, C.lilac, C.pink, C.yellow, C.cyan, C.pink];
  out.push(part('phone',
    `<path class="iso-halo" d="${slab(box(pc[0], pc[1], W, D, 13, pdeg), -2, 2).fill}"/>`,
    solid(C.ink, slab(box(pc[0], pc[1], W, D, 13, pdeg), 0, 7, 1.4)),
    flat(k.roundedPlan({ x: 0, y: 0, w: 70, d: 138, r: 9 }, 6).map(([u, v]) => PL(u + 4, v + 4)), z, '#141117'),
    flat(quad(30, 8, 48, 12), z + 0.02, '#000'),
    circle(...PL(18, 30), 9, z + 0.03, C.lilac[0]),
    txt(PL(18, 30), z + 0.05, pdeg, 'CD', { size: 6, fill: INK, spacing: -0.3 }),
    txt(PL(32, 26), z + 0.05, pdeg, 'creativedesign', { size: 4.2, fill: '#efe9f1', anchor: 'start', weight: 600 }),
    txt(PL(32, 33), z + 0.05, pdeg, '248 · 12,4k · 310', { size: 3.4, fill: '#8c8491', anchor: 'start', weight: 500 }),
    flat(quad(8, 44, 62, 51), z + 0.03, C.lilac[0]),
    txt(PL(35, 47.5), z + 0.06, pdeg, 'Seguir', { size: 3.6, fill: INK, weight: 600 }),
    tiles.map((c, i) => {
      const u = 8 + (i % 3) * 18.5, v = 58 + Math.floor(i / 3) * 18.5;
      return flat(quad(u, v, u + 17, v + 17), z + 0.03, c[0]) + (i % 4 === 0 ? circle(...PL(u + 11, v + 6), 3.4, z + 0.05, '#fff7') : '');
    }).join(''),
    [14, 30, 46, 62].map((u, i) => circle(...PL(u, 126), 2.6, z + 0.04, i === 3 ? C.lilac[0] : '#6e6475')).join(''),
  ));
  out.push(part('like',
    tether(-8, 30, 44, 7.05),
    plate(-30, 30, 64, 44, 20, 10, C.pink, HEART(8, 5.5, 1, '#fff')
      + `<text x="21" y="10.6" font-size="9" fill="#fff" font-family="'Parkinsans', sans-serif" font-weight="700" dominant-baseline="middle">1,2k</text>`),
  ));
  out.push(part('comment',
    tether(75, 50, 18, 0),
    plate(38, 50, 40, 74, 22, 11, C.cyan, `<circle cx="11" cy="11" r="6" fill="${C.lilac[0]}"/>`
      + `<text x="21" y="11.6" font-size="7" fill="${INK}" font-family="'Parkinsans', sans-serif" font-weight="600" dominant-baseline="middle">¡Me encanta!</text>`),
  ));
  return out;
}

// A ceramic mug drawn as a real cylinder: a left-lit gradient body, a thick
// D handle on the silhouette's right edge, a lip, coffee inside, steam, and
// a printed band whose logo sits on the side facing the viewer.
function mugSvg(mx, my, r, h) {
  const at = (p) => k.iso(p, P);
  const [vx, vy] = k.towardViewer(P);
  // Plan direction of the silhouette's right edge (perpendicular to the view).
  const side = [vy, -vx];
  const sx = at([mx + side[0] * r, my + side[1] * r, 0])[0] > at([mx, my, 0])[0] ? side : [-side[0], -side[1]];
  const xs = k.circleRing(mx, my, r, 64).map(([x, y]) => at([x, y, 0])[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const grad = (id, stops) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x1}" y2="0">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const fillOf = (z0, z1, rr = r) => k.cylinder(mx, my, rr, z0, z1 - z0, P, 64).fill;
  const ellipse = (z, rr) => k.onTop(k.circleRing(mx, my, rr, 64), z, P, true);
  const b0 = h * 0.22, b1 = h * 0.74, lip = 2.6;

  const defs = `<defs>${grad('mug-ceramic', [[0, '#d3ccd6'], [0.16, '#fbf8fc'], [0.34, '#ece6ee'], [0.78, '#b7afbc'], [1, '#8f8794']])}`
    + grad('mug-band', [[0, '#d7578f'], [0.16, '#f48ab5'], [0.34, '#e86a9f'], [0.78, '#b44a78'], [1, '#8c385e']])
    + `<linearGradient id="mug-inside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d6572"/><stop offset="1" stop-color="#d7d0da"/></linearGradient>`
    + `<clipPath id="mug-mouth"><path d="${ellipse(h, r - lip)}"/></clipPath></defs>`;

  // Handle: a D in the plane through the axis and the right edge, so it
  // reads full-face; three strokes make it a glazed tube.
  const hc = h * 0.52, hr = h * 0.27, out = 15;
  const handlePts = [];
  for (let i = 0; i <= 32; i++) {
    const a = -Math.PI / 2 + (i / 32) * Math.PI;
    const d = r - 3 + out * Math.cos(a);
    handlePts.push(at([mx + sx[0] * d, my + sx[1] * d, hc - hr * Math.sin(a)]));
  }
  const hd = k.pathOf(handlePts);
  const handle = `<path d="${hd}" fill="none" stroke="#8a8290" stroke-width="12.5" stroke-linecap="round"/>`
    + `<path d="${hd}" fill="none" stroke="#e4dee7" stroke-width="9.5" stroke-linecap="round"/>`
    + `<path d="${hd}" fill="none" stroke="#fbf8fc" stroke-width="2.6" stroke-linecap="round" transform="translate(-1.6 -1.2)"/>`;

  // Lip, the inside wall, and coffee a little below the rim.
  const top = `<path d="${ellipse(h, r)}" fill="#f4f0f5" stroke="#8a8290" stroke-width="0.8"/>`
    + `<path d="${ellipse(h, r - lip)}" fill="url(#mug-inside)"/>`
    + `<g clip-path="url(#mug-mouth)"><path d="${ellipse(h - 7, r - lip)}" fill="#4a2c22"/><path d="${ellipse(h - 7, r - lip - 5)}" fill="#5c382b" opacity="0.6"/></g>`
    + `<path d="${ellipse(h, r - lip)}" fill="none" stroke="#b9b1bd" stroke-width="0.8"/>`;
  const ceramic = (z0, z1) => `<path d="${fillOf(z0, z1)}" fill="url(#mug-ceramic)"/>`;
  const edge = `<path d="${fillOf(0, h)}" fill="none" stroke="#8a8290" stroke-width="0.8"/>`;
  // The handle hangs off the right edge; the body's near half overlaps its roots.
  const body = defs
    + `<path class="iso-halo" d="${fillOf(-2, 0, r + 3)}"/>`
    + handle + ceramic(0, h) + edge + `<path d="${k.sideArc(mx, my, r, 1.6, P, 32)}" fill="none" stroke="#a69eab" stroke-width="0.8"/>` + top;

  // The print: the band, the body above it redrawn over the band's cap,
  // and the logo on the tangent plane facing the viewer.
  const front = [mx + vx * (r + 0.4), my + vy * (r + 0.4)];
  const o = at([...front, b0 + (b1 - b0) * 0.5]);
  const u = at([front[0] + vy, front[1] - vx, b0 + (b1 - b0) * 0.5]);
  const dn = at([...front, b0 + (b1 - b0) * 0.5 - 1]);
  const m = `matrix(${(u[0] - o[0]).toFixed(3)} ${(u[1] - o[1]).toFixed(3)} ${(dn[0] - o[0]).toFixed(3)} ${(dn[1] - o[1]).toFixed(3)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;
  const print = `<path d="${fillOf(b0, b1, r + 0.3)}" fill="url(#mug-band)"/>`
    + `<path d="${k.sideArc(mx, my, r + 0.3, b0, P, 32)}" fill="none" stroke="#8c385e" stroke-width="0.8"/>`
    + ceramic(b1, h) + `<path d="${k.sideArc(mx, my, r + 0.3, b1, P, 32)}" fill="none" stroke="#8c385e" stroke-width="0.8"/>` + edge + top
    + `<g transform="${m}"><text x="0" y="0" font-size="15" fill="${INK}" font-family="'Parkinsans', sans-serif" font-weight="700" letter-spacing="-0.8" text-anchor="middle" dominant-baseline="middle">CD</text>`
    + `<path d="M 10.5 -6 l 4 9.6 1.4 -4.2 4.2 -1.4 z" fill="${INK}"/></g>`;

  // Steam: three soft wisps rising out of the coffee.
  const c = at([mx, my, h]);
  const steam = [-8, 0, 8].map((dx, i) => {
    const x = c[0] + dx, y = c[1] - 6;
    return `<path d="M ${x} ${y} c -5 -8 5 -12 0 -20 s 5 -12 0 -20" fill="none" stroke="#f3dcf4" stroke-width="2.2" stroke-linecap="round" opacity="${[0.35, 0.5, 0.3][i]}"/>`;
  }).join('');
  return { body, print, steam };
}

const scenes = {
  identidad: ['Identidad visual: un logo construido sobre su retícula, con su guía de color, su tipografía y un lápiz.', identidad()],
  redes: ['Redes sociales: un teléfono con un perfil y su cuadrícula de publicaciones, una publicación flotando y notificaciones de me gusta y comentarios.', redes()],
  flyers: ['Flyers: un tiraje impreso y tres diseños abiertos en abanico.', flyers()],
  papeleria: ['Papelería: hoja membretada, sobre con sello de cera, tarjetas de presentación y un bolígrafo.', papeleria()],
  personalizacion: ['Personalización: una camiseta, una funda de teléfono, una taza con su diseño impreso y un llavero.', personalizacion()],
};
for (const [name, [label, body]] of Object.entries(scenes)) {
  writeFileSync(join(HERE, `${name}.svg`), k.figureSvg({ width: WIDTH, height: HEIGHT, label, body }));
}
console.log('wrote', Object.keys(scenes).join(', '));
