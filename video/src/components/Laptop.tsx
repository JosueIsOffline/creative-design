import type { CSSProperties, ReactNode } from 'react';
import { brand } from '../config';

// A soft reflection across the glass; `at` 0→1 slides it as the device turns.
export const Glare: React.FC<{ at: number }> = ({ at }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(115deg, transparent ${at * 100 - 30}%, rgba(255,255,255,0.06) ${at * 100}%, transparent ${at * 100 + 22}%)` }} />
);

// A soft contact shadow on the floor under a device.
export const FloorShadow: React.FC<{ width: number }> = ({ width }) => (
  <div style={{ position: 'absolute', left: '50%', bottom: -width * 0.035, width: width * 1.1, height: width * 0.07, transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.85), transparent)', filter: `blur(${width * 0.012}px)` }} />
);

// A space-grey laptop in CSS: thin black bezel with a camera notch,
// aluminium lid edge, and a base with a lit top edge and a thumb notch.
// Children render at the site's 1440×900, scaled to `screenWidth`.
export const Laptop: React.FC<{ screenWidth: number; children: ReactNode; style?: CSSProperties; sheen?: number }> = ({ screenWidth: sw, children, style, sheen = 0.5 }) => {
  const s = sw / 1440;
  const bezel = sw * 0.014;
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      <FloorShadow width={sw * 1.17} />
      <div style={{
        position: 'relative', padding: bezel, paddingTop: bezel * 1.5, borderRadius: sw * 0.026,
        background: '#050505',
        boxShadow: `0 0 0 ${sw * 0.0022}px #3d3d43, 0 0 0 ${sw * 0.0035}px #1b1b1e, inset 0 0 0 1px rgba(255,255,255,0.04)`,
      }}>
        <div style={{ position: 'relative', width: sw, height: 900 * s, overflow: 'hidden', borderRadius: sw * 0.008, background: brand.bg }}>
          <div style={{ width: 1440, height: 900, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
          <Glare at={sheen} />
        </div>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: sw * 0.1, height: bezel * 1.9, background: '#050505', borderRadius: `0 0 ${bezel}px ${bezel}px`, display: 'grid', placeItems: 'center' }}>
          <div style={{ width: bezel * 0.45, height: bezel * 0.45, borderRadius: '50%', background: '#1a1d2a', boxShadow: 'inset 0 0 2px rgba(120,140,255,0.5)' }} />
        </div>
      </div>
      <div style={{
        position: 'relative', width: sw * 1.17, height: sw * 0.028, marginTop: -1,
        borderRadius: `${sw * 0.004}px ${sw * 0.004}px ${sw * 0.04}px ${sw * 0.04}px / ${sw * 0.004}px ${sw * 0.004}px ${sw * 0.02}px ${sw * 0.02}px`,
        background: 'linear-gradient(180deg, #8a8a91 0%, #4b4b52 12%, #2c2c31 55%, #16161a 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
      }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: sw * 0.13, height: sw * 0.008, background: 'linear-gradient(180deg, #2a2a2f, #3a3a40)', borderRadius: `0 0 ${sw * 0.01}px ${sw * 0.01}px` }} />
      </div>
    </div>
  );
};
