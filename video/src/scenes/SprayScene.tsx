import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Caption } from '../components/Caption';
import { FocusCam, Footage, sourceTime, type Segment } from '../components/Footage';
import { Rig } from '../components/Rig';
import { brand, copy, timing } from '../config';
import { REEL_SAFE, keys, useLayout } from '../motion';
import { markOf, pointerAt } from '../recordings';

const S = markOf('rec-spray');
const SEGMENTS: Segment[] = [{ from: S + 0.2, to: S + 4.4, rate: 1.4 }];

// 9 — The footer wordmark as a tilted plane seen from below; the camera
// rides along behind the spray can as it paints. Reels: closer, so the
// letters fill the width and the can carries the shot across the name.
export const SprayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical } = useLayout();
  const end = timing.scenes.spray;
  const t = sourceTime(SEGMENTS, frame, fps);
  const [px] = pointerAt('rec-spray', t - 0.18) ?? [720, 740];
  const box = vertical ? { width: 1000, height: 620 } : { width: 1720, height: 640 };
  return (
    <AbsoluteFill>
      <Backdrop spot={[50, 58]} />
      <Rig rx={keys(frame, [[0, 38], [end, 16]])} ry={keys(frame, [[0, -22], [end, 12]])} y={vertical ? 160 : 90} scale={keys(frame, [[0, 0.92], [end, 1.04]])}>
        <div style={{ borderRadius: 32, overflow: 'hidden', boxShadow: `0 0 0 1px ${brand.line}, 0 80px 140px -40px rgba(0,0,0,0.95)` }}>
          <FocusCam {...box} cx={px} cy={740} zoom={vertical ? 2.5 : 1.08}>
            <Footage name="rec-spray" segments={SEGMENTS} pointer="spray" />
          </FocusCam>
        </div>
      </Rig>
      <Caption text={copy.captions.spray} at={8} out={end - 10} size={vertical ? 96 : 76} align="center"
        style={{ top: vertical ? REEL_SAFE.top + 120 : 80, left: 80, right: 80 }} />
    </AbsoluteFill>
  );
};
