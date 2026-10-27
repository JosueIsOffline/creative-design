import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Arrow } from '../components/Footage';
import { Signature, Wordmark } from '../components/Wordmark';
import { brand, copy } from '../config';
import { display, mono } from '../fonts';
import { OUT, REEL_SAFE, keys, useLayout, useSpring } from '../motion';

const Rise: React.FC<{ delay: number; children: React.ReactNode }> = ({ delay, children }) => {
  const k = useSpring(delay, { damping: 22, stiffness: 150, mass: 0.8 });
  return <div style={{ opacity: Math.min(1, k * 1.4), filter: `blur(${Math.max(0, 1 - k) * 10}px)`, transform: `translateY(${(1 - k) * 26}px)` }}>{children}</div>;
};

const TYPE_AT = 36, PILL_AT = 52, CLICK = 92;

// 12 — The name once more; the URL types itself out; then a pointer glides
// in and clicks "Escríbenos por WhatsApp" — the pill presses, a ripple and
// a pinch of confetti. Reels: stacked, everything inside the safe band.
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { vertical } = useLayout();
  const typed = Math.max(0, Math.min(copy.url.length, Math.floor((frame - TYPE_AT) / 1.1)));
  const caret = frame > TYPE_AT && (typed < copy.url.length || Math.floor(frame / 8) % 2 === 0);
  // The pointer: from off to the lower right into the pill, then a click.
  const glide = keys(frame, [[66, 0], [CLICK - 4, 1, OUT]]);
  const press = keys(frame, [[CLICK, 0], [CLICK + 3, 1, OUT], [CLICK + 12, 0]]);
  const ring = (frame - CLICK) / 16;
  const burst = keys(frame, [[CLICK, 0], [CLICK + 14, 1, OUT]]);
  const pill = vertical ? { fs: 38, pad: '22px 44px' } : { fs: 34, pad: '22px 44px' };
  return (
    <AbsoluteFill>
      <Backdrop spot={[50, 46]} glow={1 + 0.6 * keys(frame, [[CLICK, 0], [CLICK + 3, 1, OUT], [CLICK + 30, 0]])} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: vertical ? 24 : 30, ...(vertical ? { top: REEL_SAFE.top, height: REEL_SAFE.bottom - REEL_SAFE.top } : {}), transform: `scale(${keys(frame, [[0, 1.06], [110, 1]])})` }}>
        <Wordmark fontSize={vertical ? 136 : 180} at={0} stacked={vertical} />
        <Signature delay={30} fontSize={vertical ? 50 : 54} />
        <div style={{ marginTop: vertical ? 6 : 22, height: vertical ? 50 : 48, fontFamily: mono, fontSize: vertical ? 40 : 40, letterSpacing: '0.03em', color: brand.fg }}>
          {copy.url.slice(0, typed)}
          <span style={{ opacity: caret ? 1 : 0, color: brand.lilac }}>▍</span>
        </div>
        <Rise delay={PILL_AT}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexDirection: vertical ? 'column' : 'row' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ fontFamily: display, fontWeight: 600, fontSize: pill.fs, color: brand.bg, background: brand.lilac, borderRadius: 999, padding: pill.pad, transform: `scale(${1 - press * 0.06})`, boxShadow: `0 0 ${40 + press * 40}px rgba(217,168,217,${0.25 + press * 0.3})` }}>
                {copy.cta}
              </div>
              {ring >= 0 && ring <= 1 && (
                <div style={{ position: 'absolute', left: '62%', top: '58%', width: 140, height: 140, margin: -70, borderRadius: '50%', border: `${4 * (1 - ring) + 1}px solid ${brand.lilac}`, transform: `scale(${0.2 + ring})`, opacity: 1 - ring }} />
              )}
              {burst > 0 && [brand.fg, brand.yellow, brand.pink, brand.blue, brand.lilac, brand.yellow].map((col, i) => {
                const a = (-150 + i * 26) * (Math.PI / 180), d = 40 + burst * 70;
                return <div key={i} style={{ position: 'absolute', left: '62%', top: '58%', width: 7, height: 20, borderRadius: 4, background: col, opacity: 1 - Math.max(0, burst - 0.6) / 0.4, transform: `translate(${Math.cos(a) * d - 3.5}px, ${Math.sin(a) * d - 10}px) rotate(${(a * 180) / Math.PI + 90}deg)` }} />;
              })}
              <div style={{ position: 'absolute', left: `calc(62% + ${(1 - glide) * 520}px)`, top: `calc(58% + ${(1 - glide) * 300}px)`, opacity: glide > 0 ? 1 : 0, transform: 'scale(1.6)', transformOrigin: '0 0' }}>
                <div style={{ position: 'relative' }}><Arrow x={0} y={0} press={press > 0.3} /></div>
              </div>
            </div>
            <div style={{ fontFamily: display, fontWeight: 500, fontSize: vertical ? 30 : 28, color: brand.muted }}>{copy.instagram}</div>
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
