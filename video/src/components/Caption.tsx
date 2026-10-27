import type { CSSProperties } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand } from '../config';
import { display } from '../fonts';

// Words in *stars* get the brand gradient (lilac → pink).
export function parse(text: string) {
  let accent = false;
  return text.split(' ').map((w) => {
    if (w.startsWith('*')) accent = true;
    const word = { w: w.replace(/\*/g, ''), accent };
    if (w.endsWith('*')) accent = false;
    return word;
  });
}

export const accentStyle: CSSProperties = {
  backgroundImage: `linear-gradient(100deg, ${brand.lilac} 10%, ${brand.pink} 95%)`,
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
};

// Keynote-style type: each word lifts out of a soft blur, staggered, and
// fades back out at `out`. Calm — no bounce, no spin.
export const Caption: React.FC<{ text: string; at?: number; out?: number; size?: number; align?: 'left' | 'center' | 'right'; style?: CSSProperties }> = ({
  text, at = 8, out, size = 76, align = 'left', style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cfg = { damping: 200, stiffness: 90, mass: 1 };
  const leave = out === undefined ? 0 : spring({ frame: frame - out, fps, config: { damping: 200, stiffness: 140 } });
  return (
    <div style={{
      position: 'absolute', textAlign: align, fontFamily: display, fontWeight: 600, fontSize: size, lineHeight: 1.04,
      letterSpacing: '-0.035em', color: brand.fg, opacity: 1 - leave, filter: leave ? `blur(${leave * 10}px)` : undefined, ...style,
    }}>
      {parse(text).map(({ w, accent }, i) => {
        const k = spring({ frame: frame - at - i * 2.5, fps, config: cfg });
        return (
          <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: k, filter: `blur(${(1 - k) * 12}px)`, transform: `translateY(${(1 - k) * 0.35}em)`, ...(accent ? accentStyle : {}) }}>
            {w}{' '}
          </span>
        );
      })}
    </div>
  );
};
