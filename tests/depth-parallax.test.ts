import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('Parallax depth (adapted from the Halo reference depth())', () => {
  it('scroll-reveal.ts drifts [data-depth] elements against their section scroll, scrubbed', async () => {
    const src = await read('src/scripts/scroll-reveal.ts');
    expect(src).toContain('[data-depth]');
    expect(src).toContain('dataset.depthAmount');
    expect(src).toContain('scrub: true');
  });

  it("About's background photo is scaled up and marked for the depth effect, so panning never exposes an edge", async () => {
    const src = await read('src/components/About.astro');
    expect(src).toContain('data-depth');
    expect(src, 'the image must be oversized beyond its crop so the y-pan stays covered').toContain('scale-110');
  });
});
