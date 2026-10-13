import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('SublimationFigure (built with the anatomy skill)', () => {
  it('imports the generated figure via Vite-resolved imports, not fs.readFileSync (breaks in the production build)', async () => {
    const src = await read('src/components/SublimationFigure.astro');
    expect(src, 'fs.readFileSync + import.meta.url breaks once Vite relocates the compiled chunk in the build').not.toContain("from 'node:fs'");
    expect(src).toContain("import figureSvg from '../../tools/heat-press-figure/figure.svg?raw'");
    expect(src).toContain("import { P, OPEN_Z, CLOSED_Z } from '../../tools/heat-press-figure/figure-data.json'");
  });

  it('marks its section as an always-dark zone so the floating header pill forces dark tone over it', async () => {
    const src = await read('src/components/SublimationFigure.astro');
    expect(src).toContain('data-nav-theme="dark"');
  });

  it('drives a looping press cycle (close, hold with live temp/timer readout, open, peel-reveal) gated by IntersectionObserver', async () => {
    const src = await read('src/components/SublimationFigure.astro');
    expect(src).toContain("{ name: 'closing'");
    expect(src).toContain("{ name: 'pressing'");
    expect(src).toContain("{ name: 'revealing'");
    expect(src).toContain('IntersectionObserver');
  });

  it('goes still under reduced motion instead of looping forever off-camera', async () => {
    const src = await read('src/components/SublimationFigure.astro');
    expect(src).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(src).toContain('reduced.matches');
  });

  it('re-mounts safely via a per-element marker on astro:page-load', async () => {
    const src = await read('src/components/SublimationFigure.astro');
    expect(src).toContain('dataset.pressMounted');
    expect(src).toContain("addEventListener('astro:page-load', mount)");
  });

  it('is wired into the home page after Services', async () => {
    const src = await read('src/pages/index.astro');
    expect(src).toContain("import SublimationFigure from '../components/SublimationFigure.astro'");
    expect(src).toContain('<SublimationFigure />');
  });
});

describe('heat-press-figure build script (geometry source for the figure)', () => {
  it('generates figure.svg and figure-data.json for the Astro component to import', async () => {
    const files = await fs.readdir(path.join(process.cwd(), 'tools/heat-press-figure'));
    expect(files).toContain('figure.svg');
    expect(files).toContain('figure-data.json');
    expect(files).toContain('build.mjs');
  });

  it('the heating face sits flush against the housing underside (no gap), and the moving parts carry data-part markers the live script needs', async () => {
    const src = await read('tools/heat-press-figure/build.mjs');
    expect(src, 'a bug fixed during review — the face was floating with a visible gap below the housing').toContain("k.insetPlan(HEAD, 2)");
    expect(src).toContain('data-part="head"');
    expect(src).toContain('data-part="paper"');
    expect(src).toContain('data-part="design-sub"');
    expect(src).toContain('data-part="heat-face"');
    expect(src).toContain('data-part="temp-text"');
    expect(src).toContain('data-part="time-text"');
  });
});
