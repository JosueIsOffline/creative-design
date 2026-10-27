import type { CSSProperties } from 'react';
import { brand } from '../config';

// The brand's cursor (the "a" of "Creative"), with its confetti burst.
// `press` 0→1→0 squeezes the arrow; `burst` 0→1 pops the confetti out.
export const Cursor: React.FC<{ press?: number; burst?: number; style?: CSSProperties }> = ({ press = 0, burst = 1, style }) => (
  <svg viewBox="-4 -0.5 27 32.5" style={{ height: '0.8125em', width: 'auto', verticalAlign: 'baseline', overflow: 'visible', ...style }} fill="none">
    <g transform="rotate(16.5 12.5 20.5)">
      <g style={{ opacity: burst, transform: `scale(${0.2 + 0.8 * burst})`, transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
        <g transform="translate(4,4) rotate(15)"><rect x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill={brand.fg} /></g>
        <g transform="translate(-1,6) rotate(-40)"><rect x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill={brand.yellow} /></g>
        <g transform="translate(-4,10) rotate(-80)"><rect x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill={brand.pink} /></g>
        <g transform="translate(-3,15) rotate(-115)"><rect x="-0.65" y="-2" width="1.3" height="4" rx="0.65" fill={brand.blue} /></g>
      </g>
      <g style={{ transform: `scale(${1 - 0.2 * press})`, transformBox: 'fill-box', transformOrigin: '0 0' }}>
        <path d="M4 12l7.07 17 2.51-7.39L21 19.07 4 12z" fill={brand.fg} stroke={brand.fg} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </g>
    </g>
  </svg>
);
