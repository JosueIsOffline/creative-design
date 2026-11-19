// The menu film's own shots (see MenuFilm.tsx): the morphing menu from a
// low angle, its links up close, the phone, shopping from the menu, and the
// theme switch that spills out of the screen into the set.
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, LightBackdrop } from '../components/Backdrop';
import { Caption } from '../components/Caption';
import { FocusCam, Footage, frameAt, type Segment } from '../components/Footage';
import { Laptop } from '../components/Laptop';
import { Phone } from '../components/Phone';
import { Rig } from '../components/Rig';
import { brand, menuCopy, menuTiming } from '../config';
import { INOUT, OUT, REEL_SAFE, keys, mix, useLayout, useZoom } from '../motion';
import { clicksOf, markOf, pointOf } from '../recordings';

const cap = menuCopy.captions;
const sideCaption = (vertical: boolean, side: 'left' | 'right' = 'left'): CSSProperties =>
  vertical ? { top: REEL_SAFE.top + 40, left: REEL_SAFE.side, right: REEL_SAFE.side } : { [side]: 110, top: 400, width: 500 };

// --- 4a. The menu, low angle ---------------------------------------------
const M = { S: markOf('m-menu'), C: markOf('m-menu', 'click'), L: markOf('m-menu', 'links') };
// On to the button, then the morph in deep slow motion.
const MENU_SEGS: Segment[] = [
  { from: M.S, to: M.C - 0.25, rate: 1 },
  { from: M.C - 0.25, to: M.C + 1.4, rate: 0.42 },
  { from: M.C + 1.4, to: M.L + 0.3, rate: 1 },
];

// The camera sits low and looks up at the laptop (top tipped away); as the
// pointer reaches "Menú" it rises toward the top of the screen and pushes
// in, so the pill opening into the glass panel fills the shot.
export const MenuLowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical } = useLayout();
  const end = menuTiming.menu;
  const fc = frameAt(MENU_SEGS, M.C, fps);
  const rise = spring({ frame, fps, config: { damping: 200, mass: 1.3, stiffness: 40 } });
  const push = keys(frame, [[fc - 24, 0], [fc + 30, 1], [end, 1.12]]);
  const sw = vertical ? 980 : 1040;
  return (
    <AbsoluteFill>
      <Backdrop spot={vertical ? [50, 40] : [60, 38]} />
      <Rig
        y={mix(vertical ? 1200 : 760, vertical ? 220 : 120, rise) + push * (vertical ? 300 : 150)}
        x={vertical ? 0 : mix(260, 150, push)}
        rx={mix(52, 26, rise) - push * 8}
        ry={keys(frame, [[0, vertical ? -18 : -24], [end, vertical ? 6 : 4]])}
        rz={mix(-3, 0, rise)}
        scale={mix(0.84, 1, rise) * (1 + push * (vertical ? 0.75 : 0.36))}>
        <Laptop screenWidth={sw} sheen={keys(frame, [[0, 0.15], [end, 0.85]])}>
          <Footage name="m-menu" segments={MENU_SEGS} />
        </Laptop>
      </Rig>
      <Caption text={cap.menu} at={fc + 6} out={end - 8} size={vertical ? 96 : 76} align={vertical ? 'center' : 'left'}
        style={vertical ? { top: REEL_SAFE.top + 40, left: REEL_SAFE.side, right: REEL_SAFE.side } : { left: 110, top: 110, width: 560 }} />
    </AbsoluteFill>
  );
};

// --- 4b. The links, then Catálogo ---------------------------------------
// The same take carries on: the pointer runs down the links (the photo
// follows), comes back to Catálogo and clicks; the page changes to the grid
// and a product opens. One menu opening in the whole film.
const N = { nav: markOf('m-menu', 'nav'), grid: markOf('m-menu', 'grid'), open: markOf('m-menu', 'open'), add: markOf('m-menu', 'add') };
const [, [, lx, ly], [, ox, oy], [, ax, ay]] = clicksOf('m-menu');
const LINK_SEGS: Segment[] = [
  { from: M.L + 0.3, to: N.nav - 0.3, rate: 1.1 },
  { from: N.nav - 0.3, to: N.nav + 0.3, rate: 0.6 },
  { from: N.nav + 0.3, to: N.grid + 0.4, rate: 1 },
];

// Straight on and close on the panel (Reels: unzoomed, framed on the
// links — the panel is wider than the crop); on the click the camera pulls
// back while the page changes to the grid.
export const MenuLinksScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { vertical } = useLayout();
  const z = useZoom(vertical ? 0 : 1);
  const [px, py] = pointOf('m-menu', 'panel');
  const fn = frameAt(LINK_SEGS, N.nav, fps);
  const cam = {
    zoom: z(keys(frame, [[0, 1.62], [fn - 20, 1.74], [fn, 1.74], [fn + 34, 1.0], [menuTiming.links, 1.04]])),
    cx: keys(frame, [[0, vertical ? lx + 80 : px - 30], [fn - 20, vertical ? lx + 80 : px + 20], [fn, vertical ? lx + 80 : px + 20], [fn + 34, 720]]),
    cy: keys(frame, [[0, vertical ? ly + 40 : py + 10], [fn, vertical ? ly + 40 : py + 10], [fn + 34, 450]]),
  };
  return (
    <AbsoluteFill>
      <Backdrop />
      <FocusCam width={W} height={H} {...cam}><Footage name="m-menu" segments={LINK_SEGS} /></FocusCam>
    </AbsoluteFill>
  );
};

// --- 5. The product ----------------------------------------------------------
const SHOP_SEGS: Segment[] = [
  { from: N.grid + 0.4, to: N.open - 0.2, rate: 1.2 },
  { from: N.open - 0.2, to: N.open + 0.7, rate: 0.7 },
  { from: N.open + 0.7, to: N.add - 0.25, rate: 1.4 },
  { from: N.add - 0.25, to: N.add + 1.15, rate: 0.85 },
];

// The card fades open centred (punch-in on the click, then the camera
// follows it to the middle), then "Agregar al carrito" → ✓ (a second punch).
export const ShopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { vertical } = useLayout();
  const end = menuTiming.product;
  const z = useZoom(0.45);
  const f1 = frameAt(SHOP_SEGS, N.open, fps), f2 = frameAt(SHOP_SEGS, N.add, fps);
  const cam = {
    zoom: z(keys(frame, [[0, 1.05], [f1 - 10, 1.3], [f1, 1.3], [f1 + 16, 1.16, OUT], [f1 + 34, 1.1], [f2 - 16, 1.3], [f2, 1.6], [f2 + 10, 1.85, OUT], [end, 1.7]])),
    // Reels: start framed on the product already — a pan across the grid
    // at that crop moved too far per frame.
    cx: keys(frame, [[0, vertical ? ox : 720], [f1 - 10, ox], [f1, ox], [f1 + 16, 720], [f2 - 16, 720], [f2, ax], [end, ax]]),
    cy: keys(frame, [[0, 450], [f1 - 10, oy], [f1, oy], [f1 + 16, 420], [f2 - 16, 520], [f2, ay], [end, ay - 40]]),
  };
  return (
    <AbsoluteFill>
      <Backdrop />
      <FocusCam width={W} height={H} {...cam}><Footage name="m-menu" segments={SHOP_SEGS} /></FocusCam>
      <AbsoluteFill style={{ background: vertical ? 'linear-gradient(rgba(6,6,6,0.9), transparent 32%)' : 'linear-gradient(0deg, rgba(6,6,6,0.85), transparent 35%)' }} />
      <Caption text={cap.product} at={8} out={end - 10} size={vertical ? 96 : 76} align={vertical ? 'center' : 'left'}
        style={vertical ? { top: REEL_SAFE.top + 40, left: REEL_SAFE.side, right: REEL_SAFE.side } : { left: 110, bottom: 100 }} />
    </AbsoluteFill>
  );
};

// --- 6. The phone: a first glimpse of day mode -------------------------------
const P = { S: markOf('m-phone'), T: markOf('m-phone', 'tap') };
// The wipe crosses the screen ~0.5–0.85 s after the tap: slow motion there.
const PHONE_SEGS: Segment[] = [
  { from: P.S, to: P.T + 0.3, rate: 1 },
  { from: P.T + 0.3, to: P.T + 1.1, rate: 0.4 },
  { from: P.T + 1.1, to: P.T + 2.6, rate: 1 },
];

// Low angle: the phone swings up and a tap on the sun turns the site to
// day mode — a teaser for the next shot. 16:9: the laptop waits out of
// focus behind it, still at night.
export const MenuPhoneScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical } = useLayout();
  const end = menuTiming.phone;
  const rise = spring({ frame, fps, config: { damping: 200, mass: 1.2, stiffness: 50 } });
  return (
    <AbsoluteFill>
      <Backdrop spot={vertical ? [50, 55] : [36, 50]} />
      {!vertical && (
        <Rig x={keys(frame, [[0, 520], [end, 440]])} y={-30} z={-900} ry={-16} rx={6} blur={6} opacity={0.5}>
          <Laptop screenWidth={1040}><Footage name="m-theme" segments={[{ from: 0, to: 1, rate: 0.2 }]} pointer={false} /></Laptop>
        </Rig>
      )}
      <Rig
        y={mix(vertical ? 1400 : 900, vertical ? 200 : 20, rise)}
        rx={mix(55, 12, rise) - keys(frame, [[24, 0], [end, 6]])}
        ry={keys(frame, [[0, -36], [end, -12]])}
        rz={mix(10, 2, rise)}
        x={vertical ? 0 : -300}
        scale={keys(frame, [[20, 1], [end, 1.05]])}>
        <Phone screenWidth={vertical ? 500 : 330} sheen={keys(frame, [[0, 0.1], [end, 0.85]])}>
          <Footage name="m-phone" segments={PHONE_SEGS} pointer={false} size={[390, 844]} />
        </Phone>
      </Rig>
      <Caption text={cap.phone} at={12} out={end - 10} size={vertical ? 96 : 76} align={vertical ? 'center' : 'right'}
        style={vertical ? { top: REEL_SAFE.top, left: REEL_SAFE.side, right: REEL_SAFE.side } : { right: 110, bottom: 150, width: 520 }} />
    </AbsoluteFill>
  );
};

// --- 7. Day and night --------------------------------------------------------
const TH = { S: markOf('m-theme'), L: markOf('m-theme', 'light'), D: markOf('m-theme', 'dark') };
// On the site the diagonal crosses the screen from ~0.5 s to ~0.85 s after
// the click (measured off the take); both crossings play in slow motion.
const WIPE = [0.45, 0.95] as const;
const THEME_SEGS: Segment[] = [
  { from: TH.S, to: TH.L + 0.3, rate: 1.1 },
  { from: TH.L + 0.3, to: TH.L + 1.2, rate: 0.4 },
  { from: TH.L + 1.2, to: TH.D + 0.3, rate: 1.5 },
  { from: TH.D + 0.3, to: TH.D + 1.2, rate: 0.4 },
  { from: TH.D + 1.2, to: TH.D + 2.2, rate: 1 },
];

// A diagonal mask across the whole frame, from the top-left corner to past
// the bottom-right: the same gesture as the site's wipe, at video scale.
const wipe = (p: number): CSSProperties => {
  const e = mix(-14, 114, p);
  const m = `linear-gradient(135deg, #000 ${e - 9}%, transparent ${e + 9}%)`;
  return { maskImage: m, WebkitMaskImage: m };
};

// The laptop in the dark set; the pointer switches the site to light and the
// wipe doesn't stop at the screen's edge — it sweeps on across the whole set
// (backdrop, caption) in step with it. Then back to night, the same way.
export const ThemeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical } = useLayout();
  const end = menuTiming.theme;
  const at = (t: number) => frameAt(THEME_SEGS, t, fps);
  const toLight = keys(frame, [[at(TH.L + WIPE[0]), 0], [at(TH.L + WIPE[1]), 1, INOUT]]);
  const toDark = keys(frame, [[at(TH.D + WIPE[0]), 0], [at(TH.D + WIPE[1]), 1, INOUT]]);
  const spot: [number, number] = vertical ? [50, 52] : [62, 46];
  const caption = (color: string) => (
    <Caption text={cap.theme} at={10} out={end - 10} size={vertical ? 96 : 76} align={vertical ? 'center' : 'left'}
      style={{ ...(vertical ? { top: REEL_SAFE.top + 40, left: REEL_SAFE.side, right: REEL_SAFE.side } : { left: 110, top: 400, width: 470 }), color }} />
  );
  const layer = (mask: number | null, children: ReactNode) => (
    <AbsoluteFill style={mask === null ? undefined : wipe(mask)}>{children}</AbsoluteFill>
  );
  return (
    <AbsoluteFill>
      {layer(null, <><Backdrop spot={spot} />{caption(brand.fg)}</>)}
      {toLight > 0 && layer(toLight, <><LightBackdrop spot={spot} />{caption('#1a1418')}</>)}
      {toDark > 0 && layer(toDark, <><Backdrop spot={spot} />{caption(brand.fg)}</>)}
      <Rig
        x={vertical ? 0 : keys(frame, [[0, 280], [end, 230]])}
        y={vertical ? 230 : 30}
        rx={keys(frame, [[0, 16], [end, 8]])}
        ry={keys(frame, [[0, vertical ? -14 : -20], [end, vertical ? 4 : -8]])}
        scale={keys(frame, [[0, 0.96], [end, 1.04]])}>
        <Laptop screenWidth={vertical ? 980 : 1000} sheen={keys(frame, [[0, 0.1], [end, 0.9]])}>
          <Footage name="m-theme" segments={THEME_SEGS} />
        </Laptop>
      </Rig>
    </AbsoluteFill>
  );
};
