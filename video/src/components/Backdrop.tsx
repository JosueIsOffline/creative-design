import { AbsoluteFill, useCurrentFrame } from 'remotion';

// The set: near-black, one soft key light behind the subject (`spot`, in %
// of the frame) with a faint lilac cast, and a vignette that closes the
// corners down — product-film lighting rather than a flat page.
export const Backdrop: React.FC<{ glow?: number; spot?: [number, number] }> = ({ glow = 1, spot = [50, 45] }) => (
  <AbsoluteFill style={{ background: '#060606' }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(48% 42% at ${spot[0]}% ${spot[1]}%, rgba(255,255,255,${0.05 * glow}), transparent 70%),
          radial-gradient(70% 60% at ${spot[0]}% ${spot[1] - 6}%, rgba(217,168,217,${0.13 * glow}), transparent 72%),
          radial-gradient(60% 50% at ${100 - spot[0]}% 100%, rgba(94,200,232,${0.035 * glow}), transparent 70%)`,
      }}
    />
    {/* Circular, so it reads the same on 16:9 and 9:16 (an ellipse sized to a tall frame looks like an egg). */}
    <AbsoluteFill style={{ background: 'radial-gradient(circle farthest-corner at 50% 45%, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />
  </AbsoluteFill>
);

// Fine film grain over everything, re-seeded every frame so it lives.
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.09 }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 37} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

