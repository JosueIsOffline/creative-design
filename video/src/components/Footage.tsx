import type { ReactNode } from 'react';
import { OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand } from '../config';
import { clicksOf, pointerAt, type Recording } from '../recordings';

// A speed-ramped stretch of a recording: each segment plays seconds
// [from, to] of it at `rate` (fast on the way in, slow on the click).
export type Segment = { from: number; to: number; rate: number };

const framesOf = (s: Segment, fps: number) => Math.round(((s.to - s.from) / s.rate) * fps);

// Log time shown at composition frame `frame`.
export function sourceTime(segments: Segment[], frame: number, fps: number) {
  let f = frame;
  for (const s of segments) {
    const d = framesOf(s, fps);
    if (f < d) return s.from + (f / fps) * s.rate;
    f -= d;
  }
  const last = segments[segments.length - 1];
  return last.to;
}

// Composition frame at which log time `t` is shown (for timing camera moves to clicks).
export function frameAt(segments: Segment[], t: number, fps: number) {
  let f = 0;
  for (const s of segments) {
    if (t <= s.to) return f + Math.round(((t - s.from) / s.rate) * fps);
    f += framesOf(s, fps);
  }
  return f;
}

export const totalOf = (segments: Segment[], fps: number) => segments.reduce((a, s) => a + framesOf(s, fps), 0);

type PointerKind = 'arrow' | 'spray' | false;

// The recording at 1440×900 with a drawn pointer (headless captures have
// none) that presses on each click and leaves a lilac ripple.
export const Footage: React.FC<{ name: Recording; segments: Segment[]; pointer?: PointerKind; pointerFrom?: number; children?: ReactNode }> = ({
  name, segments, pointer = 'arrow', pointerFrom = -Infinity, children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = sourceTime(segments, frame, fps);
  let at = 0;
  const clips = segments.map((s, i) => {
    const d = framesOf(s, fps);
    const el = (
      <Sequence key={i} from={at} durationInFrames={i === segments.length - 1 ? Infinity : d} layout="none">
        <OffthreadVideo src={staticFile(`capture/${name}.mp4`)} trimBefore={Math.max(0, Math.round(s.from * fps))} playbackRate={s.rate} muted style={{ position: 'absolute', inset: 0, width: 1440, height: 900 }} />
      </Sequence>
    );
    at += d;
    return el;
  });
  const p = pointer && t >= pointerFrom ? pointerAt(name, t) : null;
  const clicks = clicksOf(name);
  const press = clicks.some(([c]) => t >= c && t - c < 0.14);
  return (
    <div style={{ position: 'relative', width: 1440, height: 900, overflow: 'hidden', background: brand.bg }}>
      {clips}
      {children}
      {clicks.map(([c, x, y], i) => {
        const k = (t - c) / 0.55;
        if (k < 0 || k > 1) return null;
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: 120, height: 120, marginLeft: -60, marginTop: -60, borderRadius: '50%',
            border: `${3 * (1 - k) + 1}px solid ${brand.lilac}`, background: `rgba(217,168,217,${0.25 * (1 - k)})`,
            transform: `scale(${0.15 + k * 0.85})`, opacity: 1 - k,
          }} />
        );
      })}
      {p && (pointer === 'spray' ? <SprayCan x={p[0]} y={p[1]} /> : <Arrow x={p[0]} y={p[1]} press={press} />)}
    </div>
  );
};

// A macOS-style pointer; its tip is at (x, y).
export const Arrow: React.FC<{ x: number; y: number; press: boolean }> = ({ x, y, press }) => (
  <svg width="30" height="40" viewBox="0 0 30 40" style={{ position: 'absolute', left: x - 3, top: y - 2, transform: `scale(${press ? 0.85 : 1})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.45))' }}>
    <path d="M3 2 L3 30 L10 23.5 L14.5 34 L19 32 L14.6 21.8 L24 21.8 Z" fill="#fff" stroke="#000" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

// The site's spray-can cursor (nozzle at the hotspot).
const SprayCan: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <svg width="48" height="48" viewBox="0 0 32 32" style={{ position: 'absolute', left: x - 6, top: y - 13.5, filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.5))' }}>
    <g stroke="#111" strokeWidth="1.5" strokeLinejoin="round">
      <rect x="11" y="11" width="12" height="18" rx="3" fill={brand.lilac} />
      <rect x="13" y="7" width="8" height="5" rx="1.5" fill="#f2f2f2" />
      <rect x="7" y="7.5" width="6" height="3" rx="1" fill="#f2f2f2" />
    </g>
    <path d="M15 17h4" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Frames a 1440×900 source in a `width`×`height` box (cover), looking at
// (cx, cy) with `zoom` on top of the cover fit; never shows past the edges.
export const FocusCam: React.FC<{ width: number; height: number; cx: number; cy: number; zoom: number; children: ReactNode }> = ({ width, height, cx, cy, zoom, children }) => {
  const s = Math.max(width / 1440, height / 900) * zoom;
  const left = Math.min(0, Math.max(width - 1440 * s, width / 2 - cx * s));
  const top = Math.min(0, Math.max(height - 900 * s, height / 2 - cy * s));
  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left, top, width: 1440, height: 900, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
    </div>
  );
};
