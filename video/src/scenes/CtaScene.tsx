import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { FocusCam, Footage, frameAt, sourceTime, type Segment } from '../components/Footage';
import { Rig } from '../components/Rig';
import { timing } from '../config';
import { OUT, keys, mix, useLayout } from '../motion';
import { markOf, pointOf, pointerAt } from '../recordings';

const S = markOf('rec-cta');
const CARDS = markOf('rec-cta', 'cards');
const CLICK = S + 0.85; // the panel cursor's first click (CSS: 700 ms delay + 4% of 3.6 s)
// Back to back, no stretch skipped: a jump in the page mid camera move reads
// as a flicker.
const SEGMENTS: Segment[] = [
  { from: S + 0.1, to: S + 1.75, rate: 0.9 },
  { from: S + 1.75, to: CARDS + 3.5, rate: 1.8 },
];

// 8 — Tight on "ide▸?": the cursor glides in and clicks (punch-in on the
// click), then the camera pulls out and follows the pointer across the
// photo fan, the plane turning slightly as it goes. No caption: the panel's
// own headline says it. Reels: framed on the whole headline, then the fan.
export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { vertical } = useLayout();
  const end = timing.scenes.cta;
  const fc = frameAt(SEGMENTS, CLICK, fps);
  const fb = frameAt(SEGMENTS, CARDS, fps);
  const [px, py] = pointOf('rec-cta', 'cursor');
  // Reels: the headline's middle rather than the cursor, so it reads whole.
  const [hx, hy] = vertical ? [468, 420] : [px, py];
  const t = sourceTime(SEGMENTS, frame, fps);
  const p = t > CARDS ? pointerAt('rec-cta', t - 0.25) ?? [720, 450] : [720, 450];
  const follow = keys(frame, [[fb - 4, 0], [fb + 22, 1]]);
  const cam = {
    // Reels: the 9:16 crop is already ~2.1×, so only a small click punch.
    zoom: vertical
      ? keys(frame, [[fc, 1], [fc + 4, 1.07, OUT], [fc + 18, 1], [fb + 10, 1.05]])
      : keys(frame, [[0, 2.1], [fc, 1.9], [fc + 4, 2.2, OUT], [fc + 18, 1.9], [fb - 8, 1.8], [fb + 22, 1.25], [end, 1.35]]),
    cx: mix(keys(frame, [[0, hx], [fc + 18, hx], [fb + 18, 720]]), mix(720, p[0], vertical ? 0.9 : 0.55), follow),
    cy: mix(keys(frame, [[0, hy], [fc + 18, hy], [fb + 18, 450]]), mix(450, p[1], 0.35), follow),
  };
  return (
    <AbsoluteFill>
      <Backdrop />
      <Rig ry={keys(frame, [[0, -6], [end, 6]]) * (vertical ? 0.4 : 1)} rx={keys(frame, [[0, 4], [end, -2]])} scale={vertical ? 1.03 : 1.1}>
        <FocusCam width={W} height={H} {...cam}>
          <Footage name="rec-cta" segments={SEGMENTS} pointerFrom={CARDS} />
        </FocusCam>
      </Rig>
    </AbsoluteFill>
  );
};
