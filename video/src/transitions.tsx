import { AbsoluteFill, Easing } from 'remotion';
import { linearTiming, type TransitionPresentation, type TransitionPresentationComponentProps } from '@remotion/transitions';
import { timing } from './config';

type Props = { kind: 'zoom' | 'whip' | 'blur'; dir: 1 | -1 };

// Edit cuts.
// - zoom: punch through — the old shot rushes at the camera and blurs out,
//   the new one lands from slightly further back.
// - whip: a fast pan — both shots slide with heavy blur, like a whip pan.
// - blur: a soft dissolve through blur.
const Cut: React.FC<TransitionPresentationComponentProps<Props>> = ({ children, presentationDirection, presentationProgress: p, passedProps: { kind, dir } }) => {
  const entering = presentationDirection === 'entering';
  const k = entering ? 1 - p : p; // 0 = on screen, 1 = gone
  let style: React.CSSProperties;
  if (kind === 'zoom') {
    style = { opacity: entering ? 1 - k * 0.9 : 1 - k, filter: `blur(${k * 24}px)`, transform: `scale(${entering ? 1 - k * 0.18 : 1 + k * 0.6})` };
  } else if (kind === 'whip') {
    const x = (entering ? k : -k) * 55 * dir;
    style = { opacity: 1 - k * 0.6, filter: `blur(${Math.sin(k * Math.PI) * 30 + k * 10}px)`, transform: `translateX(${x}%) skewX(${-dir * k * 6}deg)` };
  } else {
    style = { opacity: 1 - k, filter: `blur(${k * 18}px)`, transform: `scale(${entering ? 1 + k * 0.04 : 1 - k * 0.04})` };
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

const make = (kind: Props['kind'], dir: 1 | -1 = 1) => (): TransitionPresentation<Props> => ({ component: Cut, props: { kind, dir } });
export const zoomThrough = make('zoom');
export const whipLeft = make('whip', 1);
export const whipRight = make('whip', -1);
export const blurThrough = make('blur');
export const smooth = linearTiming({ durationInFrames: timing.cut, easing: Easing.bezier(0.7, 0, 0.3, 1) });
