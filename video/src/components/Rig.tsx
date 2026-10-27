import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';

// A device placed in 3D, centred in the frame. Positive rx tips the top away
// from the camera — the device seen from below.
export type Pose = { rx?: number; ry?: number; rz?: number; x?: number; y?: number; z?: number; scale?: number; blur?: number; opacity?: number };

export const Rig: React.FC<Pose & { children: ReactNode; perspective?: number }> = ({
  rx = 0, ry = 0, rz = 0, x = 0, y = 0, z = 0, scale = 1, blur = 0, opacity = 1, perspective = 2200, children,
}) => (
  // Blur/opacity go on this flat outer layer: a filter on the 3D-transformed
  // (preserve-3d) element itself renders unstably in Chrome — it flickered.
  <AbsoluteFill style={{ perspective, alignItems: 'center', justifyContent: 'center', filter: blur ? `blur(${blur}px)` : undefined, opacity }}>
    <div style={{
      // No preserve-3d: the devices are flat, and a preserved 3D context let
      // Chrome drop the whole layer for a frame now and then.
      transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${scale})`,
    }}>
      {children}
    </div>
  </AbsoluteFill>
);
