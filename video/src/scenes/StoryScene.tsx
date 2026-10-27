import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Caption } from '../components/Caption';
import { Footage, type Segment } from '../components/Footage';
import { Laptop } from '../components/Laptop';
import { Rig } from '../components/Rig';
import { copy, timing } from '../config';
import { REEL_SAFE, keys, useLayout } from '../motion';
import { markOf } from '../recordings';

const S = markOf('rec-story');
// The 9 s first-visit scroll story, sped up.
const SEGMENTS: Segment[] = [{ from: S + 0.2, to: S + 9.4, rate: 2.6 }];

// 4 — The other side of the orbit: the camera swings in from the right,
// pushing in while the six service cards are dealt. It ends square to the
// screen, so the next shot can dive straight in.
export const StoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { vertical } = useLayout();
  const end = timing.scenes.story;
  const pose = {
    rx: keys(frame, [[0, 20], [end, 8]]),
    ry: keys(frame, [[0, 32], [end, -14]]),
    rz: keys(frame, [[0, 3], [end, 0]]),
    x: vertical ? 0 : keys(frame, [[0, -260], [end, -200]]),
    y: vertical ? 170 : keys(frame, [[0, 80], [end, 0]]),
    z: keys(frame, [[0, -260], [end, 0]]),
    scale: vertical ? 1 : 1,
  };
  return (
    <AbsoluteFill>
      <Backdrop spot={vertical ? [50, 52] : [38, 48]} />
      <Rig {...pose}>
        <Laptop screenWidth={vertical ? 980 : 1040} sheen={keys(frame, [[0, 0.9], [end, 0.25]])}>
          <Footage name="rec-story" segments={SEGMENTS} pointer={false} />
        </Laptop>
      </Rig>
      <Caption text={copy.captions.story} at={8} out={end - 10} size={vertical ? 96 : 76} align={vertical ? 'center' : 'right'}
        style={vertical ? { top: REEL_SAFE.top + 60, left: REEL_SAFE.side, right: REEL_SAFE.side } : { right: 110, top: 420, width: 480 }} />
    </AbsoluteFill>
  );
};
