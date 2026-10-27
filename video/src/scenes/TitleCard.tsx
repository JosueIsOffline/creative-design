import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { accentStyle } from '../components/Caption';
import { brand } from '../config';
import { display } from '../fonts';
import { useLayout } from '../motion';

// A full-screen typographic beat between shots. `swap`: each word replaces
// the last, one per `every` frames (Diseño. → Sublimación. → …). Otherwise
// the lines build up, stacked. Lines in *stars* take the brand gradient.
export const TitleCard: React.FC<{ lines: string[]; every: number; swap?: boolean }> = ({ lines, every, swap = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vertical, width } = useLayout();
  // As big as the frame allows: Parkinsans bold runs ~0.6 em per character.
  const fit = (line: string) => Math.min(vertical ? 150 : 210, (width - 2 * (vertical ? 90 : 160)) / (line.replace(/\*/g, '').length * 0.6));
  // Each word starts 2 frames early so the swap never shows an empty frame.
  const current = Math.min(lines.length - 1, Math.floor((frame + 2) / every));
  const push = 1 + frame * 0.0012; // a slow, constant push-in
  return (
    <AbsoluteFill>
      <Backdrop glow={0.7} spot={[50, 50]} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', transform: `scale(${push})` }}>
        {lines.map((line, i) => {
          if (swap && i !== current) return null;
          if (i > current) return null;
          const k = spring({ frame: frame - i * every + 2, fps, config: { damping: 200, stiffness: 220 } });
          const accent = line.startsWith('*');
          return (
            <div key={i} style={{
              fontFamily: display, fontWeight: 700, fontSize: fit(line), letterSpacing: '-0.045em', lineHeight: 1.02, color: brand.fg, textAlign: 'center',
              opacity: k, filter: `blur(${(1 - k) * 16}px)`, transform: `scale(${1.06 - 0.06 * k})`, ...(accent ? accentStyle : {}),
            }}>
              {line.replace(/\*/g, '')}
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
