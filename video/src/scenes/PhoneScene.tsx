import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Caption } from '../components/Caption';
import { Laptop } from '../components/Laptop';
import { PageScroll, pages } from '../components/PageScroll';
import { Phone } from '../components/Phone';
import { Rig } from '../components/Rig';
import { copy, timing } from '../config';
import { REEL_SAFE, keys, mix, useLayout } from '../motion';

const { offsets } = pages.mobile;
// [frame the scroll starts, page y to land on]
const STOPS: [number, number][] = [[0, 0], [24, offsets.howto - 20], [64, offsets.featured - 20]];

// 6 — Low angle again: the phone swings up from below, tipped back and
// turned, the mobile site scrolling on it. 16:9: the laptop sits out of
// focus behind it, for depth. Reels: the phone alone, filling the frame.
export const PhoneScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical } = useLayout();
  const end = timing.scenes.phone;
  const rise = spring({ frame, fps, config: { damping: 200, mass: 1.2, stiffness: 50 } });
  let y = 0;
  for (let i = 1; i < STOPS.length; i++) {
    y = mix(y, STOPS[i][1], spring({ frame: frame - STOPS[i][0], fps, config: { damping: 200, mass: 1.4, stiffness: 28 } }));
  }
  const phone = {
    y: mix(vertical ? 1400 : 900, vertical ? 200 : 20, rise),
    rx: mix(55, 12, rise) - keys(frame, [[24, 0], [end, 6]]),
    ry: keys(frame, [[0, -36], [end, -12]]),
    rz: mix(10, 2, rise),
    x: vertical ? 0 : -300,
    scale: keys(frame, [[20, 1], [end, 1.05]]),
  };
  return (
    <AbsoluteFill>
      <Backdrop spot={vertical ? [50, 55] : [36, 50]} />
      {!vertical && (
        <Rig x={keys(frame, [[0, 520], [end, 440]])} y={-30} z={-900} ry={-16} rx={6} blur={6} opacity={0.5}>
          <Laptop screenWidth={1040}><PageScroll device="desktop" scrollY={pages.desktop.offsets.featured - 60} /></Laptop>
        </Rig>
      )}
      <Rig {...phone}>
        <Phone screenWidth={vertical ? 500 : 330} sheen={keys(frame, [[0, 0.1], [end, 0.85]])}>
          <PageScroll device="mobile" scrollY={y} />
        </Phone>
      </Rig>
      <Caption text={copy.captions.phone} at={12} out={end - 10} size={vertical ? 96 : 76} align={vertical ? 'center' : 'right'}
        style={vertical ? { top: REEL_SAFE.top, left: REEL_SAFE.side, right: REEL_SAFE.side } : { right: 110, bottom: 150, width: 520 }} />
    </AbsoluteFill>
  );
};
