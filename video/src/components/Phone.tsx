import type { CSSProperties, ReactNode } from 'react';
import { brand } from '../config';
import { FloorShadow, Glare } from './Laptop';

// A phone in CSS: brushed-titanium rim with side buttons, thin black
// bezel, dynamic island. Children render at 390×844 (the mobile capture),
// scaled to `screenWidth`.
export const Phone: React.FC<{ screenWidth: number; children: ReactNode; style?: CSSProperties; sheen?: number }> = ({ screenWidth: sw, children, style, sheen = 0.5 }) => {
  const s = sw / 390;
  const rim = sw * 0.016, bezel = sw * 0.03;
  const button = (side: 'left' | 'right', top: number, h: number) => (
    <div style={{ position: 'absolute', [side]: -rim * 0.9, top: top * sw, width: rim * 1.1, height: h * sw, borderRadius: rim, background: 'linear-gradient(90deg, #4a4a50, #8b8b92, #4a4a50)' }} />
  );
  return (
    <div style={{ position: 'relative', ...style }}>
      <FloorShadow width={sw * 0.95} />
      {button('left', 0.42, 0.09)}
      {button('left', 0.56, 0.16)}
      {button('left', 0.76, 0.16)}
      {button('right', 0.6, 0.24)}
      <div style={{ padding: rim, borderRadius: sw * 0.18, background: 'linear-gradient(135deg, #8c8c93 0%, #3a3a3f 22%, #1c1c1f 50%, #3a3a3f 78%, #8c8c93 100%)', boxShadow: '0 50px 90px -40px rgba(0,0,0,0.9)' }}>
        <div style={{ padding: bezel, borderRadius: sw * 0.165, background: '#030303' }}>
          <div style={{ position: 'relative', width: sw, height: 844 * s, overflow: 'hidden', borderRadius: sw * 0.13, background: brand.bg }}>
            <div style={{ width: 390, height: 844, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
            <Glare at={sheen} />
            <div style={{ position: 'absolute', top: 11 * s, left: '50%', transform: 'translateX(-50%)', width: 120 * s, height: 34 * s, borderRadius: 999, background: '#000' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
