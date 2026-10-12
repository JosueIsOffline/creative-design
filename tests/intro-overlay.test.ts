import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('First-visit intro overlay (adapted from the Halo reference Intro)', () => {
  it('starts hidden by default, so without JavaScript it never shows', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/pages/index.astro'), 'utf-8');
    expect(src).toMatch(/id="intro-overlay"\s+class="[^"]*\bhidden\b/);
  });

  it('is skipped under reduced motion and on repeat visits within the session', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/pages/index.astro'), 'utf-8');
    expect(src).toContain("matchMedia('(prefers-reduced-motion: reduce)').matches || seen");
    expect(src).toContain("sessionStorage.getItem('intro-seen')");
    expect(src).toContain("sessionStorage.setItem('intro-seen', '1')");
  });

  it('removes itself from the DOM once it finishes, restoring body scroll', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/pages/index.astro'), 'utf-8');
    expect(src).toContain('overlay.remove()');
    expect(src).toContain("document.body.style.overflow = ''");
  });

  it('re-mounts safely via a per-element marker on astro:page-load', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/pages/index.astro'), 'utf-8');
    expect(src).toContain('overlay.dataset.introMounted');
    expect(src).toContain("addEventListener('astro:page-load', mountIntro)");
  });
});
