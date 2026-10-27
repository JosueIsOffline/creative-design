import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Signature, Wordmark } from '../components/Wordmark';
import { OUT, keys, useLayout } from '../motion';

const AT = 4; // reveal start; the cursor clicks at AT + 42 (see Wordmark)

// 1 — The name pulls into focus; the cursor clicks it into place, and the
// click lifts the light and nudges the camera in. (Reels: stacked.)
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { vertical } = useLayout();
  const click = AT + 42;
  const push = keys(frame, [[0, 0.97], [75, 1.03]]);
  const punch = keys(frame, [[click, 0], [click + 4, 0.035, OUT], [click + 24, 0]]);
  const light = keys(frame, [[0, 0.3], [click, 0.7], [click + 4, 1.5, OUT], [click + 30, 1.05]]);
  return (
    <AbsoluteFill>
      <Backdrop glow={light} spot={[50, 48]} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: vertical ? 48 : 44, transform: `scale(${push + punch})` }}>
        <Wordmark fontSize={vertical ? 200 : 190} at={AT} stacked={vertical} />
        <Signature delay={click + 6} fontSize={vertical ? 64 : 56} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
