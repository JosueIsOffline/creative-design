import { interpolate, useCurrentFrame } from 'remotion';
import { brand, copy } from '../config';
import { display, script } from '../fonts';
import { SNAPPY, useSpring } from '../motion';
import { Cursor } from './Cursor';

const [before, after] = ['Cre', 'tive Design'];

const Letter: React.FC<{ ch: string; delay: number }> = ({ ch, delay }) => {
  const k = useSpring(delay, { damping: 200, mass: 1, stiffness: 60 });
  return (
    <span style={{ display: 'inline-block', whiteSpace: 'pre', opacity: k, filter: `blur(${(1 - k) * 34}px)`, transform: `scale(${1.2 - 0.2 * k})` }}>{ch}</span>
  );
};

// "Cre▸tive Design" as on the site: the letters pull into focus one after
// another, then the cursor glides into the "a", clicks, and the confetti
// bursts from its tip. `at` = frame the reveal starts.
// `stacked` breaks it after "tive" (for 9:16).
export const Wordmark: React.FC<{ fontSize: number; at?: number; stacked?: boolean }> = ({ fontSize, at = 0, stacked = false }) => {
  const frame = useCurrentFrame();
  const glideAt = at + 20;
  const glide = useSpring(glideAt, { damping: 200, mass: 1, stiffness: 90 });
  const clickAt = glideAt + 22;
  const press = interpolate(frame, [clickAt, clickAt + 4, clickAt + 10], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const burst = useSpring(clickAt + 3, SNAPPY);
  let i = 0; // letter index across both halves, for the stagger
  return (
    <div style={{ fontFamily: display, fontWeight: 700, fontSize, letterSpacing: '-0.045em', lineHeight: 0.95, color: brand.lilac, whiteSpace: 'nowrap', textAlign: 'center' }}>
      {[...before].map((c) => <Letter key={i} ch={c} delay={at + i++ * 2.5} />)}
      <span style={{ display: 'inline-block', opacity: glide, transform: `translate(${(1 - glide) * 0.5}em, ${(1 - glide) * 0.35}em) rotate(${(1 - glide) * 12}deg)` }}>
        <Cursor press={press} burst={burst} style={{ marginInline: '0.03em -0.01em' }} />
      </span>
      {[...after].map((c) => (stacked && c === ' ' ? (i++, <br key="br" />) : <Letter key={i} ch={c} delay={at + i++ * 2.5} />))}
    </div>
  );
};

export const Signature: React.FC<{ delay: number; fontSize: number }> = ({ delay, fontSize }) => {
  const k = useSpring(delay);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: fontSize * 0.5, opacity: k, filter: `blur(${(1 - k) * 12}px)`, color: brand.fg }}>
      <span style={{ height: 1, width: fontSize * 1.6, background: `linear-gradient(90deg, transparent, ${brand.fg})` }} />
      <span style={{ fontFamily: script, fontWeight: 600, fontSize }}>{copy.signature}</span>
      <span style={{ height: 1, width: fontSize * 1.6, background: `linear-gradient(270deg, transparent, ${brand.fg})` }} />
    </div>
  );
};
