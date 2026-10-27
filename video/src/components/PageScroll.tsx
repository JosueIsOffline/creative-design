import { Img, staticFile } from 'remotion';
import desktop from '../../public/capture/desktop.json';
import mobile from '../../public/capture/mobile.json';

export type Device = 'desktop' | 'mobile';
export const pages = { desktop, mobile };

// The captured page (stacked tiles) scrolled to `scrollY` CSS px, with the
// floating header overlaid on top as it is on the real site. On the phone
// the page sits under a status-bar strip, clear of the dynamic island.
export const PageScroll: React.FC<{ device: Device; scrollY: number }> = ({ device, scrollY }) => {
  const m = pages[device];
  const top = device === 'mobile' ? 44 : 0;
  return (
    <div style={{ position: 'relative', width: m.width, height: m.viewportHeight + top, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top, width: m.width, height: m.viewportHeight, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: m.width, transform: `translateY(${-scrollY}px)` }}>
          {m.tiles.map((t) => (
            <Img key={t.file} src={staticFile(`capture/${t.file}`)} style={{ position: 'absolute', left: 0, top: t.y, width: m.width }} />
          ))}
        </div>
      </div>
      {device === 'mobile' && (
        // Content scrolling under the status bar fades out, as on iOS.
        <div style={{ position: 'absolute', left: 0, right: 0, top, height: 90, background: 'linear-gradient(#0d0d0c 25%, transparent)' }} />
      )}
      <Img src={staticFile(`capture/${device}-header.png`)} style={{ position: 'absolute', left: 0, top: top + 24, width: m.width }} />
    </div>
  );
};
