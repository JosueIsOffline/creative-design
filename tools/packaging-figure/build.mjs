import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const WIDTH = 560;
const HEIGHT = 420;

const DESK = { x: -110, y: -60, w: 220, d: 120, r: 8 };
const DESK_H = 8;

const BOX = { x: -46, y: -30, w: 92, d: 64, r: 4 };
const WALL_H = 26;
const WALL_T = 4;
const BOX_FLOOR_Z = DESK_H;
const BOX_TOP_Z = BOX_FLOOR_Z + WALL_H;

const MUG_R = 15;
const MUG_H = 22;
const MUG_XY = [-6, 0];

const TAG = { x: 40, y: -10, w: 30, d: 20, r: 3 };

const P = k.fitProjection([...k.boxCorners(DESK, -6, 0), [BOX.x, BOX.y, BOX_TOP_Z + 24]], WIDTH, HEIGHT, { pad: 30, azimuth: 42 });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const straight = (p1, p2) => `M${at(p1).join(',')} L${at(p2).join(',')}`;

function desk() {
  const out = [`<path class="iso-halo" d="${k.haloOf(DESK, -6, 6, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(DESK, 16))) {
    out.push(S(k.cylinder(x, y, 4.5, -6, 6, P, 16), { tone: 'lo' }));
  }
  out.push(S(k.slabOf(DESK, 0, DESK_H, P, 6, 1), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(DESK, 5), DESK_H, P, 6), { tone: 'faint' }));
  return out.join('');
}

function box() {
  const out = [];
  out.push(S(k.slabOf(BOX, BOX_FLOOR_Z, 2, P, 3, 0.4), { tone: 'lo', crease: 'none' }));

  const outer = BOX;
  const inner = k.insetPlan(BOX, WALL_T);
  const corners = [
    { x: outer.x, y: outer.y, w: outer.w, d: WALL_T, r: 1 },
    { x: outer.x, y: outer.y + outer.d - WALL_T, w: outer.w, d: WALL_T, r: 1 },
    { x: outer.x, y: outer.y + WALL_T, w: WALL_T, d: outer.d - 2 * WALL_T, r: 1 },
    { x: outer.x + outer.w - WALL_T, y: outer.y + WALL_T, w: WALL_T, d: outer.d - 2 * WALL_T, r: 1 },
  ];
  corners.forEach((wall) => {
    out.push(S(k.slabOf(wall, BOX_FLOOR_Z, WALL_H, P, 2, 0.6), { tone: 'mid' }));
  });
  out.push(L(k.planOutline(inner, BOX_TOP_Z, P, 4), { tone: 'faint' }));
  out.push(L(k.planOutline(outer, BOX_TOP_Z, P, 4), { tone: 'lo' }));
  return out.join('');
}

function tissue() {
  const out = [];
  const sheets = [
    { x: -30, y: -20, w: 44, d: 10, rot: -8, z: BOX_TOP_Z - 2, h: 14, tone: 'hi' },
    { x: 2, y: -24, w: 38, d: 9, rot: 10, z: BOX_TOP_Z - 1, h: 17, tone: 'faint' },
  ];
  sheets.forEach(({ x, y, w, d, z, h, tone }) => {
    out.push(S(k.slabOf({ x, y, w, d, r: 2 }, z, h, P, 2, 0.4), { tone, crease: 'none' }));
  });
  return out.join('');
}

function mug() {
  const out = [];
  const [mx, my] = MUG_XY;
  const z = BOX_FLOOR_Z + 2;
  out.push(S(k.cylinder(mx, my, MUG_R, z, MUG_H, P, 28, 1.2), { tone: 'hi', lit: true }));
  out.push(L(k.ring(mx, my, MUG_R - 1.5, z + MUG_H - 7, P, 28), { tone: 'faint' }));
  out.push(
    k.faceTextSvg(k.topMatrix([mx, my], z + MUG_H, P, 'x'), 'CD', {
      size: 5,
      tone: 'faint',
      anchor: 'middle',
    })
  );
  return out.join('');
}

function tag() {
  const out = [];
  out.push(S(k.slabOf(TAG, DESK_H, 1.2, P, 2, 0.3), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(TAG, 2.5), DESK_H + 1.2, P, 2), { tone: 'faint' }));
  out.push(
    k.faceTextSvg(k.topMatrix([TAG.x + TAG.w / 2, TAG.y + TAG.d / 2 + 1], DESK_H + 1.2, P, 'x'), '¡Gracias!', {
      size: 2.6,
      tone: 'hi',
      anchor: 'middle',
    })
  );
  const hole = [TAG.x + TAG.w / 2, TAG.y + 3];
  out.push(D([at([...hole, DESK_H + 1.2])], { size: 0.5 }));
  const knot = [BOX.x, BOX.y];
  out.push(L(straight([...hole, DESK_H + 1.6], [...knot, BOX_FLOOR_Z + WALL_H * 0.6]), { tone: 'faint', free: true }));
  return out.join('');
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'Una caja de regalo abierta con la pieza terminada adentro, envuelta en papel de seda y una tarjeta de agradecimiento atada con hilo — así llega cada pedido.',
  body: [desk(), box(), tissue(), mug(), tag()],
});

writeFileSync(join(HERE, 'figure.svg'), svg);
console.log('wrote figure.svg');
