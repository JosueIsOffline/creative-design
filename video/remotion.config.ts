import { Config } from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCrf(16);
Config.setPixelFormat('yuv420p');

// Render with the Chrome already installed on this Mac (Remotion's own
// headless-shell download kept failing on this network). Remove this line
// to let Remotion use its bundled browser.
Config.setBrowserExecutable('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

// Motion blur asks for several video frames per output frame; under load a
// frame extraction can take longer than the 30 s default.
Config.setDelayRenderTimeoutInMilliseconds(120000);
Config.setConcurrency('50%');
