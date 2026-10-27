import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// Calm, Apple-ish springs: no overshoot unless asked for.
export const SOFT = { damping: 200, mass: 1, stiffness: 80 };
export const SNAPPY = { damping: 18, mass: 0.6, stiffness: 160 };

// 0 → 1 starting at `delay` frames.
export function useSpring(delay = 0, config = SOFT, durationInFrames?: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config, durationInFrames });
}

export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export function useLayout() {
  const { width, height } = useVideoConfig();
  return { width, height, vertical: height > width };
}

// Piecewise camera keys: [frame, value, easing?] — eased in-out between
// keys by default (a dolly that starts and lands softly); OUT for a punch.
export const INOUT = Easing.bezier(0.65, 0, 0.35, 1);
export const OUT = Easing.bezier(0.16, 1, 0.3, 1);
export function keys(frame: number, pairs: [number, number, ((t: number) => number)?][]) {
  if (frame <= pairs[0][0]) return pairs[0][1];
  for (let i = 1; i < pairs.length; i++) {
    const [f1, v1, ease = INOUT] = pairs[i];
    const [f0, v0] = pairs[i - 1];
    if (frame <= f1) return interpolate(frame, [f0, f1], [v0, v1], { easing: ease });
  }
  return pairs[pairs.length - 1][1];
}

// On 9:16 the cover crop of a 16:10 recording is already ~2.1× — punch-ins
// keep their shape but only `share` of their strength there.
export function useZoom(share: number) {
  const { vertical } = useLayout();
  return (z: number) => (vertical ? 1 + (z - 1) * share : z);
}

// Reels: Instagram lays its UI over the top ~220 px and bottom ~420 px of a
// 1080×1920 frame (and the like/comment column on the right). Text stays
// inside this band.
export const REEL_SAFE = { top: 250, bottom: 1480, side: 90 };
