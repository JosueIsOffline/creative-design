import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('CategoryFilter stays on one row (horizontal scroll instead of wrap)', () => {
  it('scrolls horizontally instead of wrapping tabs onto a second line', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/components/CategoryFilter.astro'), 'utf-8');
    expect(src, 'should no longer wrap tabs onto multiple lines').not.toContain('flex-wrap');
    expect(src, 'should scroll horizontally when tabs overflow').toContain('overflow-x-auto');
    expect(src, 'tabs should not shrink/wrap their own text while scrolling').toContain('whitespace-nowrap');
    expect(src, 'each tab should keep its natural width in the scroll track').toContain('shrink-0');
  });
});
