import { TransitionSeries } from '@remotion/transitions';
import { Fragment } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { Grain } from './components/Backdrop';
import { BEAT, copy, timing } from './config';
import { blurThrough, smooth } from './transitions';
import { CtaScene } from './scenes/CtaScene';
import { GalleryScene } from './scenes/GalleryScene';
import { HeroScene } from './scenes/HeroScene';
import { Intro } from './scenes/Intro';
import { Outro } from './scenes/Outro';
import { PhoneScene } from './scenes/PhoneScene';
import { ProductScene } from './scenes/ProductScene';
import { SprayScene } from './scenes/SprayScene';
import { StoryScene } from './scenes/StoryScene';
import { TitleCard } from './scenes/TitleCard';

const { scenes, cut } = timing;
// One word / line every two beats: time to read each.
const Title1 = () => <TitleCard lines={copy.title1} every={2 * BEAT} swap />;
const Title2 = () => <TitleCard lines={copy.title2} every={2 * BEAT} />;

// Scene order, and how each hands over to the next: `null` is a hard cut on
// the beat (most of them, as in a product film); a dissolve only where a
// move carries across (a soft cross between shots).
const SCENES = [
  { key: 'intro', C: Intro, next: null },
  { key: 'title1', C: Title1, next: null },
  { key: 'hero', C: HeroScene, next: blurThrough },
  { key: 'story', C: StoryScene, next: null }, // match cut: the dive starts from this pose
  { key: 'product', C: ProductScene, next: blurThrough },
  { key: 'phone', C: PhoneScene, next: null },
  { key: 'gallery', C: GalleryScene, next: null },
  { key: 'cta', C: CtaScene, next: blurThrough },
  { key: 'spray', C: SprayScene, next: null },
  { key: 'title2', C: Title2, next: null },
  { key: 'outro', C: Outro, next: null },
] as const;

// Real motion blur: each frame blends sub-frame samples (a 150° shutter), so
// camera moves, punch-ins and UI motion smear like a filmed shot. Not on the
// fast-scroll footage: there a frame spans several recorded frames, and the
// blend shows them as stepped copies instead of a smear.
const SHARP = new Set<string>(['story', 'gallery']);

export const totalFrames = SCENES.reduce((a, s) => a + scenes[s.key] - (s.next ? cut : 0), 0);

export const Promo: React.FC = () => {
  const { width, height } = useVideoConfig();
  // Reels: the 9:16 crop magnifies the product footage ~2×, so its dive and
  // pans move so far per frame that the blur shows doubled copies.
  const sharp = (key: string) => SHARP.has(key) || (height > width && key === 'product');
  return (
  <AbsoluteFill style={{ background: '#060606' }}>
    <TransitionSeries>
      {SCENES.map(({ key, C, next }) => (
        <Fragment key={key}>
          <TransitionSeries.Sequence durationInFrames={scenes[key]}>
            {sharp(key) ? <C /> : <CameraMotionBlur shutterAngle={150} samples={6}><C /></CameraMotionBlur>}
          </TransitionSeries.Sequence>
          {next && <TransitionSeries.Transition presentation={next()} timing={smooth} />}
        </Fragment>
      ))}
    </TransitionSeries>
    <Grain />
  </AbsoluteFill>
  );
};
