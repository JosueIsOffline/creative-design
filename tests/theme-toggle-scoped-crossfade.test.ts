import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFile(path.join(process.cwd(), p), 'utf-8');

describe('theme toggle crossfade is scoped to the icon, not the whole page', () => {
  it('theme.ts marks the transition with a class instead of a bare startViewTransition call', async () => {
    const src = await read('src/scripts/theme.ts');
    expect(src).toContain("classList.add('is-theme-transition')");
    expect(src).toContain("classList.remove('is-theme-transition')");
  });

  it('global.css disables the root crossfade only during that marked transition, and gives the icon its own short one', async () => {
    const src = await read('src/styles/global.css');
    expect(src, 'root crossfade must be killed only under the marker class, never globally (would also kill page-nav transitions)').toContain(
      'html.is-theme-transition::view-transition-old(root)'
    );
    expect(src).toContain('view-transition-name: theme-icon');
    expect(src).toContain('html.is-theme-transition::view-transition-group(theme-icon)');
  });
});
