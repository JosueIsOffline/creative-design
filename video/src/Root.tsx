import { Composition } from 'remotion';
import { Promo, totalFrames } from './Promo';
import { timing } from './config';

export const Root: React.FC = () => (
  <>
    <Composition id="Promo-16x9" component={Promo} durationInFrames={totalFrames} fps={timing.fps} width={1920} height={1080} />
    <Composition id="Promo-9x16" component={Promo} durationInFrames={totalFrames} fps={timing.fps} width={1080} height={1920} />
  </>
);
