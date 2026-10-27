import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Caption } from '../components/Caption';
import { FocusCam, Footage, frameAt, type Segment } from '../components/Footage';
import { Rig } from '../components/Rig';
import { copy, timing } from '../config';
import { OUT, REEL_SAFE, keys, useLayout, useZoom } from '../motion';
import { markOf, pointOf } from '../recordings';

const CLICK = markOf('rec-gallery', 'click');
const DUST = markOf('rec-gallery', 'dust');
const STAR = markOf('rec-gallery', 'star');
// A touch of slow motion through the click and the burst; then the comet's
// run down the page to the ✨, a little quicker.
const SEGMENTS: Segment[] = [
  { from: CLICK - 0.5, to: DUST, rate: 0.9 },
  { from: DUST, to: STAR + 0.2, rate: 1.4 },
];

// 7 — Galería: tight on the heading as the site's cursor clicks it and the
// glitter bursts off the letters (punch-in on the click), then the camera
// pulls out to ride the comet down to the ✨ on Ailyn's photo.
export const GalleryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { vertical } = useLayout();
  const end = timing.scenes.gallery;
  const z = useZoom(0.3);
  const fc = frameAt(SEGMENTS, CLICK, fps);
  const fd = frameAt(SEGMENTS, DUST, fps);
  const [hx, hy] = pointOf('rec-gallery', 'heading');
  const cam = {
    zoom: z(keys(frame, [[0, 1.4], [fc, 1.55], [fc + 4, 1.8, OUT], [fc + 20, 1.55], [fd, 1.45], [fd + 18, 1.05], [end, 1.12]])),
    cx: keys(frame, [[fd, hx], [fd + 18, 720]]),
    cy: keys(frame, [[fd, hy + 60], [fd + 18, 450]]),
  };
  return (
    <AbsoluteFill>
      <Backdrop />
      <Rig ry={keys(frame, [[0, -6], [end, 6]]) * (vertical ? 0.4 : 1)} rx={keys(frame, [[0, 5], [end, -2]])} scale={vertical ? 1.03 : 1.08}>
        <FocusCam width={W} height={H} {...cam}>
          <Footage name="rec-gallery" segments={SEGMENTS} pointer={false} />
        </FocusCam>
      </Rig>
      <AbsoluteFill style={{ background: vertical ? 'linear-gradient(rgba(6,6,6,0.97) 18%, rgba(6,6,6,0.6) 30%, transparent 42%)' : 'linear-gradient(0deg, rgba(6,6,6,0.8), transparent 32%)', opacity: keys(frame, [[fd, 0], [fd + 10, 1]]) }} />
      {/* Reels: out before the next section's heading scrolls up under it. */}
      <Caption text={copy.captions.gallery} at={fd + 6} out={vertical ? fd + 56 : end - 10} size={vertical ? 96 : 76} align={vertical ? 'center' : 'left'}
        style={vertical ? { top: REEL_SAFE.top + 40, left: REEL_SAFE.side, right: REEL_SAFE.side } : { left: 110, bottom: 100 }} />
    </AbsoluteFill>
  );
};
