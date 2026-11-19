import { TransitionSeries } from '@remotion/transitions';
import { Fragment } from 'react';
import { AbsoluteFill } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { Grain } from './components/Backdrop';
import { BEAT, menuCopy, menuTiming, timing } from './config';
import { blurThrough, smooth } from './transitions';
import { HeroScene } from './scenes/HeroScene';
import { Intro } from './scenes/Intro';
import { MenuLinksScene, MenuLowScene, MenuPhoneScene, ShopScene, ThemeScene } from './scenes/MenuScenes';
import { Outro } from './scenes/Outro';
import { SprayScene } from './scenes/SprayScene';
import { TitleCard } from './scenes/TitleCard';

// The second film (~60 s): the new morphing menu and the theme switch.
// Same grammar as Promo.tsx — hard cuts on the beat, a blur dissolve only
// where a move carries across.
const Title = () => <TitleCard lines={menuCopy.title} every={2 * BEAT} />;
const Hero = () => <HeroScene name="m-hero" end={menuTiming.hero} />;
const Spray = () => <SprayScene name="m-spray" end={menuTiming.spray} />;

const SCENES = [
  { key: 'intro', C: Intro, next: null },
  { key: 'title', C: Title, next: null },
  { key: 'hero', C: Hero, next: blurThrough },
  { key: 'menu', C: MenuLowScene, next: null },
  { key: 'links', C: MenuLinksScene, next: null }, // ends on Catálogo → the grid
  { key: 'product', C: ShopScene, next: blurThrough },
  { key: 'phone', C: MenuPhoneScene, next: null }, // day mode, a teaser…
  { key: 'theme', C: ThemeScene, next: null }, // …then the whole set
  { key: 'spray', C: Spray, next: null },
  { key: 'outro', C: Outro, next: null },
] as const;

// No motion blur on the close-ups that follow fast page motion (see Promo.tsx).
// Theme and phone too: under the blur's sub-frame sampling a video frame
// occasionally came back black (theme: a dimmed frame) or garbled (phone:
// a tiled frame).
const SHARP = new Set<string>(['links', 'product', 'theme', 'phone']);

export const menuFrames = SCENES.reduce((a, s) => a + menuTiming[s.key] - (s.next ? timing.cut : 0), 0);

export const MenuFilm: React.FC = () => (
  <AbsoluteFill style={{ background: '#060606' }}>
    <TransitionSeries>
      {SCENES.map(({ key, C, next }) => (
        <Fragment key={key}>
          <TransitionSeries.Sequence durationInFrames={menuTiming[key]}>
            {SHARP.has(key) ? <C /> : <CameraMotionBlur shutterAngle={150} samples={6}><C /></CameraMotionBlur>}
          </TransitionSeries.Sequence>
          {next && <TransitionSeries.Transition presentation={next()} timing={smooth} />}
        </Fragment>
      ))}
    </TransitionSeries>
    <Grain />
  </AbsoluteFill>
);
