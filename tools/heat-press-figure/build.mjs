import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes('--light') ? 'light' : 'dark';

const WIDTH = 720;
const HEIGHT = 480;

// --- World layout (world units ~= mm of the real machine) ---
const BASE = { x: -130, y: -75, w: 260, d: 150, r: 12 };
const BASE_H = 16;
const FOOT_H = 7;
const BASE_TOP = 0;

const MAT = k.insetPlan(BASE, 18);
const MAT_H = 3;
const MAT_TOP = BASE_TOP + MAT_H;

const POST_X = 96;
const POST_Y = -58;
const POST_R = 7;
const POST_TOP = 150;

const BRACE = { x: -POST_X - 8, y: POST_Y - 8, w: 2 * POST_X + 16, d: 16, r: 4 };
const BRACE_Z = POST_TOP - 14;

const RAIL_Y = POST_Y + 2;
const RAIL_BOTTOM = 46;
const RAIL_TOP = BRACE_Z - 2;

const HEAD = { x: -74, y: -50, w: 148, d: 100, r: 10 };
const HEAD_H = 24;
const OPEN_Z = 96;

const PANEL = { x: POST_X - 10, y: POST_Y - 34, w: 44, d: 30, r: 4 };
const PANEL_Z = 86;
const PANEL_H = 10;

const SUB = { x: -48, y: -30, w: 96, d: 60, r: 3 };
const SUB_H = 2;
const SUB_TOP = MAT_TOP + SUB_H;

const PAPER = k.insetPlan(SUB, -2.5);
const PAPER_H = 0.8;
const PAPER_TOP = SUB_TOP + PAPER_H;

const CLOSED_Z = PAPER_TOP;

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [POST_X, POST_Y, POST_TOP + 4],
    [-POST_X, POST_Y, POST_TOP + 4],
    [HEAD.x, HEAD.y, OPEN_Z + HEAD_H],
    [HEAD.x + HEAD.w, HEAD.y + HEAD.d, OPEN_Z + HEAD_H],
  ],
  WIDTH,
  HEIGHT,
  { pad: 34, azimuth: 42 }
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, FOOT_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 20))) {
    out.push(S(k.cylinder(x, y, 7.5, -BASE_H - FOOT_H, 1.6, P, 24), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 24), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 10, 1.8), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 6), 0, P), { tone: 'lo' }));
  const screws = k.corners(BASE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const labelPlate = { x: -34, y: BASE.y + BASE.d - 14, w: 68, d: 10, r: 1.5 };
  out.push(S(k.slabOf(labelPlate, 0, 0.8, P, 3), { tone: 'lo', crease: 'none' }));
  out.push(
    k.faceTextSvg(k.topMatrix([labelPlate.x + labelPlate.w / 2, labelPlate.y + labelPlate.d / 2 + 1], 0.8, P, 'x'), 'CREATIVE DESIGN · SUBLIMACIÓN', {
      size: 2.6,
      tone: 'lo',
      anchor: 'middle',
    })
  );

  out.push(S(k.slabOf(MAT, BASE_TOP, MAT_H, P, 8, 1.2), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(MAT, 4), MAT_TOP, P, 8), { tone: 'faint' }));
  return out.join('');
}

function posts() {
  const out = [];
  for (const sx of [-1, 1]) {
    const x = sx * POST_X;
    out.push(S(k.cylinder(x, POST_Y, POST_R, BASE_TOP, 10, P, 28), { tone: 'mid' }));
    out.push(S(k.cylinder(x, POST_Y, POST_R - 1.4, BASE_TOP + 10, POST_TOP - BASE_TOP - 10, P, 24, 0.8), { tone: 'mid', crease: 'none' }));
    out.push(L(k.sideArc(x, POST_Y, POST_R - 1.4, 60, P, 14), { tone: 'faint' }));
    out.push(L(k.sideArc(x, POST_Y, POST_R - 1.4, 100, P, 14), { tone: 'faint' }));

    const railX = x - sx * (POST_R - 2);
    out.push(S(k.slabOf({ x: railX - sx * 3 - (sx < 0 ? 3 : 0), y: RAIL_Y - 1.6, w: 3, d: 3.2, r: 0.8 }, RAIL_BOTTOM, RAIL_TOP - RAIL_BOTTOM, P, 2, 0.5), { tone: 'mid' }));
    out.push(D([RAIL_BOTTOM + 8, RAIL_TOP - 8].map((z) => at([railX, RAIL_Y, z])), { size: 0.4, tone: 'lo' }));
  }

  out.push(S(k.slabOf(BRACE, BRACE_Z, 14, P, 4, 1), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(BRACE, 3), BRACE_Z + 14, P, 4), { tone: 'faint' }));

  const knob = [0, BRACE.y - 5];
  out.push(S(k.cylinder(knob[0], knob[1], 6.5, BRACE_Z, 6, P, 28), { tone: 'mid' }));
  out.push(L(k.knurl(knob[0], knob[1], 6.5, BRACE_Z, BRACE_Z + 6, 32, P), { tone: 'lo' }));
  out.push(L(k.lineOnTop([knob[0], knob[1]], [knob[0], knob[1] - 6.5], BRACE_Z + 6, P), { tone: 'hi' }));
  out.push(D([at([knob[0], knob[1], BRACE_Z + 6])], { size: 0.5, tone: 'hi' }));
  return out.join('');
}

function panel() {
  const out = [];
  const bracket = { x: PANEL.x - 4, y: PANEL.y + PANEL.d / 2 - 2, w: 10, d: 4, r: 1 };
  out.push(S(k.slabOf(bracket, PANEL_Z - 4, 6, P, 2), { tone: 'mid', crease: 'none' }));
  out.push(S(k.slabOf(PANEL, PANEL_Z, PANEL_H, P, 4, 0.8), { tone: 'mid' }));

  const screen = k.insetPlan(PANEL, 5);
  out.push(S(k.slabOf(screen, PANEL_Z + PANEL_H - 0.6, 0.6, P, 2), { tone: 'lo', crease: 'none' }));
  out.push(
    k
      .faceTextSvg(k.topMatrix([screen.x + screen.w / 2, screen.y + screen.d * 0.32], PANEL_Z + PANEL_H, P, 'x'), '20°C', {
        size: 4.6,
        tone: 'lit',
        anchor: 'middle',
      })
      .replace('<text ', '<text data-part="temp-text" ')
  );
  out.push(
    k
      .faceTextSvg(k.topMatrix([screen.x + screen.w / 2, screen.y + screen.d * 0.74], PANEL_Z + PANEL_H, P, 'x'), '0s', {
        size: 3.2,
        tone: 'hi',
        anchor: 'middle',
      })
      .replace('<text ', '<text data-part="time-text" ')
  );

  const btnY = PANEL.y + PANEL.d + 4.5;
  [PANEL.x + 8, PANEL.x + PANEL.w / 2, PANEL.x + PANEL.w - 8].forEach((bx) => {
    out.push(S(k.cylinder(bx, btnY, 2.6, PANEL_Z, 2, P, 16), { tone: 'mid' }));
    out.push(L(k.ring(bx, btnY, 2.6, PANEL_Z + 2, P, 16), { tone: 'lo' }));
  });
  return out.join('');
}

function head() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(HEAD, 6), 0, 0.1, P)}" style="filter:blur(5px)"/>`];

  // Heating face: flush against the housing's underside, no gap — the lit
  // accent and the business end of the machine (what actually touches the
  // transfer paper). Drawn first so the housing's walls sit visually on it.
  const face = k.insetPlan(HEAD, 2);
  out.push(`<g data-part="heat-face">${S(k.slabOf(face, -2.2, 2.2, P, 7, 0.6), { tone: 'hi', crease: 'none', lit: true })}</g>`);
  out.push(L(k.planOutline(k.insetPlan(face, 3), 0, P, 7), { tone: 'faint' }));

  out.push(S(k.slabOf(HEAD, 0, HEAD_H, P, 8, 1.4), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(HEAD, 6), HEAD_H, P, 8), { tone: 'faint' }));

  // Heat vents along both long sides of the housing.
  for (const sy of [-1, 1]) {
    const vy = sy > 0 ? HEAD.y + HEAD.d - 3 : HEAD.y + 3;
    const ventXs = [-48, -32, -16, 0, 16, 32, 48];
    out.push(L(ventXs.map((vx) => k.lineOnTop([vx - 4, vy], [vx + 4, vy], HEAD_H - 0.2, P)).join(''), { tone: 'faint' }));
  }

  // Corner screws on the housing top.
  const headScrews = k.corners(k.insetPlan(HEAD, 9), 0);
  out.push(L(headScrews.map(([x, y]) => k.ring(x, y, 1.8, HEAD_H, P, 14)).join(''), { tone: 'lo' }));
  out.push(D(headScrews.map(([x, y]) => at([x, y, HEAD_H])), { size: 0.4 }));

  // Carriage bushings riding the two rails.
  for (const sx of [-1, 1]) {
    out.push(S(k.cylinder(sx * (HEAD.w / 2 - 6), HEAD.y - 2, 4.5, 6, 10, P, 18), { tone: 'mid' }));
  }

  // Handle bar across the back-top edge.
  const handle = { x: -34, y: HEAD.y - 10, w: 68, d: 7, r: 3 };
  out.push(S(k.slabOf({ x: handle.x - 6, y: HEAD.y + 2, w: 8, d: 6, r: 1.5 }, HEAD_H, 4, P, 2), { tone: 'mid', crease: 'none' }));
  out.push(S(k.slabOf({ x: handle.x + handle.w - 2, y: HEAD.y + 2, w: 8, d: 6, r: 1.5 }, HEAD_H, 4, P, 2), { tone: 'mid', crease: 'none' }));
  out.push(S(k.slabOf(handle, HEAD_H + 4, 5, P, 3, 0.8), { tone: 'mid' }));
  out.push(L(k.knurl(0, handle.y + handle.d / 2, handle.w / 2 - 4, HEAD_H + 4, HEAD_H + 9, 10, P, 6), { tone: 'lo' }));

  // Power indicator.
  out.push(D([at([HEAD.x + 8, HEAD.y + HEAD.d - 6, HEAD_H])], { size: 0.7, tone: 'hi' }));
  return out.join('');
}

function product() {
  const out = [];
  out.push(S(k.slabOf(SUB, MAT_TOP, SUB_H, P, 4, 0.6), { tone: 'mid' }));
  out.push(L(k.planOutline(SUB, SUB_TOP, P, 4), { tone: 'faint' }));
  return out.join('');
}

function paper() {
  const out = [];
  out.push(S(k.slabOf(PAPER, SUB_TOP, PAPER_H, P, 3, 0.4), { tone: 'hi', crease: 'none' }));
  out.push(L(k.planOutline(PAPER, PAPER_TOP, P, 3), { tone: 'lo' }));
  out.push(
    k.faceTextSvg(k.topMatrix([PAPER.x + PAPER.w / 2, PAPER.y + PAPER.d / 2], PAPER_TOP, P, 'x'), 'CD', {
      size: 9,
      tone: 'faint',
      anchor: 'middle',
    })
  );
  return out.join('');
}

function designOnSubstrate() {
  return k.faceTextSvg(k.topMatrix([SUB.x + SUB.w / 2, SUB.y + SUB.d / 2], SUB_TOP + 0.02, P, 'x'), 'CD', {
    size: 9,
    tone: 'hi',
    anchor: 'middle',
  });
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'Una prensa de calor para sublimación. El cabezal superior, con su cara calefactora, baja sobre la base: debajo hay una pieza en blanco y encima una hoja con el diseño impreso en tinta sublimática. Calor y presión sostenidos pasan la tinta de la hoja a la pieza; al abrir y despegar la hoja, el diseño queda fijado en la pieza.',
  body: [
    // Each assembly gets its own group so the site can explode the press
    // apart and put it back together on scroll (PressStory.astro).
    `<g data-part="base">${base()}</g>`,
    `<g data-part="posts">${posts()}</g>`,
    `<g data-part="panel">${panel()}</g>`,
    `<g data-part="product">${product()}`,
    `<g data-part="design-sub" style="opacity:0">${designOnSubstrate()}</g></g>`,
    `<g data-part="paper" transform="${k.translateAlong(P, [0, 0, 0])}">${paper()}</g>`,
    `<g data-part="head" transform="${k.translateAlong(P, [0, 0, OPEN_Z])}">${head()}</g>`,
  ],
});

const body = k.plateHtml({
  fig: 'Fig 1',
  title: 'Prensa de sublimación',
  hint: 'Mirá el ciclo de prensado',
  readout: 'abierta · 20°C',
  keys: [
    { mark: 'lit', label: 'Cara calefactora: calor + presión transfieren la tinta' },
    { mark: 'raised', label: 'Hoja con el diseño impreso en tinta sublimática' },
  ],
  caption:
    'Calor y presión sostenidos durante unos segundos pasan la tinta de la hoja transfer a la pieza en blanco — así funciona la sublimación.',
  body: `<div class="iso-stage" data-press tabindex="0" role="img" aria-label="Animación del ciclo de una prensa de sublimación: cierra, mantiene calor y presión, abre y revela el diseño transferido.">${svg}</div>`,
});

writeFileSync(
  join(HERE, theme === 'light' ? 'heat-press-light.html' : 'heat-press.html'),
  k.pageHtml({ title: 'Prensa de sublimación', theme, body, script: '' })
);
console.log('wrote', theme === 'light' ? 'heat-press-light.html' : 'heat-press.html');

// For embedding in the real site: the raw SVG fragment, and the small set
// of numbers the live script needs (projection + the head's travel range)
// to compute translateAlong() transforms at runtime without shipping the
// whole 35KB kit to the browser for four lines of math.
if (theme === 'dark') {
  writeFileSync(join(HERE, 'figure.svg'), svg);
  writeFileSync(
    join(HERE, 'figure-data.json'),
    JSON.stringify(
      {
        P, OPEN_Z, CLOSED_Z, PAPER_PEEL: [0, 60, 46],
        // Screen-space px per world unit along x / y / z, for runtime moves.
        AXES: { x: k.axisVector(P, [1, 0, 0]), y: k.axisVector(P, [0, 1, 0]), z: k.axisVector(P, [0, 0, 1]) },
      },
      null,
      2
    )
  );
  console.log('wrote figure.svg, figure-data.json');
}
