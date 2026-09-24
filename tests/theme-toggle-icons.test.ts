import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const LAYOUT_PATH = path.join(process.cwd(), 'src', 'layouts', 'BaseLayout.astro');

describe('theme toggle icons respect prefers-reduced-motion', () => {
  it('does not use the looping (indefinite SMIL animation) sun/moon icon variants', async () => {
    const src = await fs.readFile(LAYOUT_PATH, 'utf-8');
    expect(src, 'still uses the indefinitely-looping sunny-filled-loop icon').not.toContain('sunny-filled-loop');
    expect(src, 'still uses the indefinitely-looping moon-filled-loop icon').not.toContain('moon-filled-loop');
  });
});
