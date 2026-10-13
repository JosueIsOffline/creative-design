import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from '../../.claude/skills/anatomy/kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const WIDTH = 560;
const HEIGHT = 420;

const DESK = { x: -120, y: -65, w: 240, d: 130, r: 10 };
const DESK_H = 10;

const SCREEN_X = -20;
const SCREEN_Y = -50;
const SCREEN_W = 110;
const SCREEN_H = 72;
const SCREEN_BASE_Z = DESK_H;
const STAND_H = 26;
const SCREEN_Z = SCREEN_BASE_Z + STAND_H;

const TABLET = { x: -96, y: 2, w: 96, d: 58, r: 6 };
const TABLET_H = 4;

const KEYBOARD = { x: 14, y: 14, w: 92, d: 34, r: 4 };
const KEYBOARD_H = 4;

const P = k.fitProjection(
  [...k.boxCorners(DESK, -6, 0), [SCREEN_X - SCREEN_W / 2, SCREEN_Y, SCREEN_Z + SCREEN_H]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 42 }
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const straight = (p1, p2) => `M${at(p1).join(',')} L${at(p2).join(',')}`;

function desk() {
  const out = [`<path class="iso-halo" d="${k.haloOf(DESK, -6, 6, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(DESK, 18))) {
    out.push(S(k.cylinder(x, y, 5, -6, 6, P, 18), { tone: 'lo' }));
  }
  out.push(S(k.slabOf(DESK, 0, DESK_H, P, 8, 1.2), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(DESK, 6), DESK_H, P, 8), { tone: 'faint' }));

  const matPlan = { x: -108, y: -4, w: 96, d: 70, r: 4 };
  out.push(S(k.slabOf(matPlan, DESK_H, 0.6, P, 3, 0.3), { tone: 'lo', crease: 'none' }));
  return out.join('');
}

function monitor() {
  const out = [];
  const footPlan = { x: SCREEN_X - 16, y: SCREEN_Y + SCREEN_W * 0 - 4 + 46, w: 32, d: 14, r: 4 };
  // Foot sits centred under the screen, a bit forward of the screen's own plane.
  const foot = { x: SCREEN_X - 16, y: 18, w: 32, d: 12, r: 3 };
  out.push(S(k.slabOf(foot, DESK_H, 3, P, 3, 0.6), { tone: 'mid' }));
  out.push(S(k.cylinder(SCREEN_X, 24, 5, DESK_H + 3, STAND_H - 6, P, 20), { tone: 'mid' }));
  out.push(S(k.slabOf({ x: SCREEN_X - 16, y: 10, w: 32, d: 8, r: 2 }, SCREEN_Z - 5, 5, P, 2, 0.4), { tone: 'mid' }));

  const screenPlan = { x: SCREEN_X - SCREEN_W / 2, y: -2, w: SCREEN_W, d: 6, r: 2 };
  out.push(S(k.slabOf(screenPlan, SCREEN_Z, SCREEN_H, P, 4, 1.2), { tone: 'mid' }));

  const faceZ = SCREEN_Z + 5;
  const faceTop = SCREEN_Z + SCREEN_H - 5;
  const faceLeft = SCREEN_X - SCREEN_W / 2 + 5;
  const faceRight = SCREEN_X + SCREEN_W / 2 - 5;
  const faceY = screenPlan.y - 0.2;
  out.push(S(k.slabOf({ x: faceLeft, y: faceY, w: faceRight - faceLeft, d: 0.3, r: 0 }, faceZ, faceTop - faceZ, P, 0, 0), { tone: 'lo', crease: 'none' }));

  out.push(L(straight([faceLeft, faceY, faceTop - 14], [faceRight, faceY, faceTop - 14]), { tone: 'faint' }));
  out.push(
    k.faceTextSvg(k.sideMatrix([faceLeft + 6, faceY], faceZ + 6, P, 'right'), 'CD', {
      size: 14,
      tone: 'lit',
      anchor: 'start',
    })
  );
  out.push(
    k.faceTextSvg(k.sideMatrix([faceLeft + 6, faceY], faceTop - 10, P, 'right'), 'IDENTIDAD VISUAL', {
      size: 3.4,
      tone: 'hi',
      anchor: 'start',
    })
  );
  return out.join('');
}

function tablet() {
  const out = [];
  out.push(S(k.slabOf(TABLET, DESK_H, TABLET_H, P, 6, 0.8), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(TABLET, 6), DESK_H + TABLET_H, P, 6), { tone: 'faint' }));

  const screenInset = k.insetPlan(TABLET, 9);
  out.push(S(k.slabOf(screenInset, DESK_H + TABLET_H - 0.4, 0.4, P, 4), { tone: 'hi', crease: 'none', lit: true }));

  const cx = screenInset.x + screenInset.w * 0.4;
  const cy = screenInset.y + screenInset.d * 0.55;
  out.push(L(straight([cx - 14, cy + 10, DESK_H + TABLET_H], [cx - 2, cy - 12, DESK_H + TABLET_H]), { tone: 'faint' }));
  out.push(L(straight([cx - 2, cy - 12, DESK_H + TABLET_H], [cx + 16, cy + 6, DESK_H + TABLET_H]), { tone: 'faint' }));

  // The pen lies flat on the tablet, resting diagonally — a free line with
  // a dot nib, not an upright cylinder (which would read as a peg standing up).
  const pen = { from: [TABLET.x + TABLET.w - 20, TABLET.y + TABLET.d - 14], to: [TABLET.x + TABLET.w + 6, TABLET.y + TABLET.d + 8] };
  const penZ = DESK_H + TABLET_H + 0.5;
  out.push(L(straight([...pen.from, penZ], [...pen.to, penZ]), { tone: 'hi', free: true }));
  out.push(D([at([pen.to[0], pen.to[1], penZ])], { size: 0.6, tone: 'hi' }));

  const swatches = [
    { xy: [TABLET.x - 14, TABLET.y + 6], color: 'hi' },
    { xy: [TABLET.x - 14, TABLET.y + 20], color: 'mid' },
    { xy: [TABLET.x - 14, TABLET.y + 34], color: 'lo' },
  ];
  swatches.forEach(({ xy, color }) => {
    out.push(S(k.slabOf({ x: xy[0], y: xy[1], w: 10, d: 10, r: 2 }, DESK_H, 2, P, 2), { tone: color }));
  });
  return out.join('');
}

function keyboard() {
  const out = [];
  out.push(S(k.slabOf(KEYBOARD, DESK_H, KEYBOARD_H, P, 4, 0.6), { tone: 'mid' }));
  const rows = 3;
  const cols = 9;
  const kx0 = KEYBOARD.x + 6;
  const ky0 = KEYBOARD.y + 5;
  const stepX = (KEYBOARD.w - 12) / cols;
  const stepY = (KEYBOARD.d - 10) / rows;
  for (let r = 0; r < rows; r++) {
    const ticks = [];
    for (let c = 0; c < cols; c++) ticks.push(at([kx0 + c * stepX + stepX * 0.2, ky0 + r * stepY + stepY / 2, KEYBOARD.y + KEYBOARD_H]));
  }
  out.push(L(k.planOutline(k.insetPlan(KEYBOARD, 5), KEYBOARD_H + DESK_H, P, 4), { tone: 'faint' }));

  const mouse = { x: KEYBOARD.x + KEYBOARD.w + 14, y: KEYBOARD.y + 8, w: 16, d: 24, r: 7 };
  out.push(S(k.slabOf(mouse, DESK_H, 4, P, 7, 1.2), { tone: 'mid' }));
  return out.join('');
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'Un escritorio de diseño: una tableta digitalizadora con un boceto y su lápiz, muestras de color, teclado y mouse, y un monitor que muestra el logo terminado. Así empieza cada pieza: diseño antes de producción.',
  body: [desk(), tablet(), keyboard(), monitor()],
});

writeFileSync(join(HERE, 'figure.svg'), svg);
console.log('wrote figure.svg');
