import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Caption } from '../components/Caption';
import { Footage, type Segment } from '../components/Footage';
import { Laptop } from '../components/Laptop';
import { Rig } from '../components/Rig';
import { copy, timing } from '../config';
import { REEL_SAFE, keys, mix, useLayout } from '../motion';
import { markOf } from '../recordings';

const S = markOf('rec-hero');
// The hero's entrance in real time, then the pointer's drift, quicker.
const SEGMENTS: Segment[] = [
  { from: S, to: S + 3.4, rate: 1 },
  { from: S + 3.4, to: S + 5.4, rate: 1.8 },
];

// 3 — Low angle: the laptop rises from below the frame, tipped back, while
// the camera orbits round to face it; on screen, the real hero entrance.
// Reels: the laptop is big enough to bleed past the frame's edges.
export const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical } = useLayout();
  const end = timing.scenes.hero;
  const rise = spring({ frame, fps, config: { damping: 200, mass: 1.3, stiffness: 42 } });
  const pose = {
    y: mix(vertical ? 1100 : 640, vertical ? 170 : 40, rise),
    rx: mix(58, 14, rise) - keys(frame, [[20, 0], [end, 6]]),
    ry: keys(frame, [[0, vertical ? -24 : -30], [end, vertical ? -4 : -7]]),
    rz: mix(-4, 0, rise),
    x: vertical ? 0 : 240,
    scale: mix(0.82, 1, rise) * keys(frame, [[30, 1], [end, 1.05]]),
  };
  return (
    <AbsoluteFill>
      <Backdrop spot={vertical ? [50, 52] : [62, 48]} />
      <Rig {...pose}>
        <Laptop screenWidth={vertical ? 980 : 1040} sheen={keys(frame, [[0, 0.1], [end, 0.9]])}>
          <Footage name="rec-hero" segments={SEGMENTS} />
        </Laptop>
      </Rig>
      <Caption text={copy.captions.hero} at={14} out={end - 10} size={vertical ? 96 : 76} align={vertical ? 'center' : 'left'}
        style={vertical ? { top: REEL_SAFE.top + 60, left: REEL_SAFE.side, right: REEL_SAFE.side } : { left: 110, top: 420, width: 480 }} />
    </AbsoluteFill>
  );
};
