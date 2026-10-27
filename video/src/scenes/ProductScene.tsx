import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Caption } from '../components/Caption';
import { FocusCam, Footage, frameAt, type Segment } from '../components/Footage';
import { Laptop } from '../components/Laptop';
import { Rig } from '../components/Rig';
import { copy, timing } from '../config';
import { OUT, REEL_SAFE, keys, mix, useLayout, useZoom } from '../motion';
import { clicksOf, markOf } from '../recordings';

const S = markOf('rec-product');
const [[c1, x1, y1], [c2, x2, y2]] = clicksOf('rec-product');
// Speed ramp: on to each click, a gentle slow-motion through it.
// Reels magnify the footage ~2×, so the card opening gets deeper slow motion
// there — at 0.75× it moved too far per frame and read as a jump.
const segments = (vertical: boolean): Segment[] => [
  { from: S, to: c1 - 0.35, rate: 1 },
  { from: c1 - 0.35, to: c1 + 0.9, rate: vertical ? 0.45 : 0.75 },
  { from: c1 + 0.9, to: c2 - 0.3, rate: 1.6 },
  // Ends while the ✓ shows (the site turns the button back after 1.3 s); the
  // last frame then holds.
  { from: c2 - 0.3, to: c2 + 1.15, rate: 0.85 },
];
const DIVE = 20; // frames for the camera to fly into the screen

// 5 — Match cut from the last shot's pose, then the camera dives into the
// screen and works like an editor's camera: it chases the pointer, punches
// in on each click (the card opening, then "Agregar al carrito" → ✓) and
// eases back out between them.
export const ProductScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { vertical } = useLayout();
  const end = timing.scenes.product;
  const z = useZoom(0.45);
  const SEGMENTS = segments(vertical);
  const f1 = frameAt(SEGMENTS, c1, fps), f2 = frameAt(SEGMENTS, c2, fps);
  const footage = <Footage name="rec-product" segments={SEGMENTS} />;

  let shot;
  if (frame < DIVE + 4) {
    // Flying in: the laptop squares up and grows until its screen covers the frame.
    const sw = vertical ? 980 : 1040;
    const k = spring({ frame, fps, config: { damping: 200, mass: 1, stiffness: 80 }, durationInFrames: DIVE });
    const cover = (Math.max(W / 1440, H / 900) * 1440) / sw;
    shot = (
      <Rig rx={mix(8, 0, k)} ry={mix(-14, 0, k)} x={mix(vertical ? 0 : -200, 0, k)} y={mix(vertical ? 170 : 0, sw * 0.016 * cover, k)} scale={mix(1, cover, k)}>
        <Laptop screenWidth={sw}>{footage}</Laptop>
      </Rig>
    );
  }
  // The hand-off to the full-frame camera (see below).
  if (frame >= DIVE) {
    const cam = {
      // Punches: a soft 10-frame push on each click, never while the camera
      // is also travelling sideways.
      zoom: z(keys(frame, [[DIVE, 1], [f1 - 10, 1.3], [f1, 1.3], [f1 + 10, 1.5, OUT], [f1 + 30, 1.25], [f2 - 16, 1.3], [f2, 1.6], [f2 + 10, 1.85, OUT], [end, 1.7]])),
      cx: keys(frame, [[DIVE, 720], [f1 - 10, x1], [f1 + 4, x1], [f1 + 30, 720], [f2 - 16, 720], [f2, x2], [end, x2]]),
      cy: keys(frame, [[DIVE, 450], [f1 - 10, y1], [f1 + 4, y1], [f1 + 30, 440], [f2 - 16, 520], [f2, y2], [end, y2 - 40]]),
    };
    const full = <FocusCam width={W} height={H} {...cam}>{footage}</FocusCam>;
    // Blur-through: the laptop shot rushes on and blurs out as the full
    // frame sharpens in, so their slightly different framings never show as
    // a double image.
    const k = (frame - DIVE + 1) / 7;
    shot = frame < DIVE + 6
      ? <>
          <AbsoluteFill style={{ filter: `blur(${k * 24}px)`, transform: `scale(${1 + k * 0.15})`, opacity: 1 - k }}>{shot}</AbsoluteFill>
          <AbsoluteFill style={{ opacity: k, filter: `blur(${(1 - k) * 12}px)` }}>{full}</AbsoluteFill>
        </>
      : full;
  }
  return (
    <AbsoluteFill>
      <Backdrop />
      {shot}
      <AbsoluteFill style={{ background: vertical ? 'linear-gradient(rgba(6,6,6,0.9), transparent 32%)' : 'linear-gradient(0deg, rgba(6,6,6,0.85), transparent 35%)', opacity: keys(frame, [[DIVE - 6, 0], [DIVE + 6, 1]]) }} />
      <Caption text={copy.captions.product} at={DIVE + 4} out={end - 10} size={vertical ? 96 : 76} align={vertical ? 'center' : 'left'}
        style={vertical ? { top: REEL_SAFE.top + 40, left: REEL_SAFE.side, right: REEL_SAFE.side } : { left: 110, bottom: 100 }} />
    </AbsoluteFill>
  );
};
