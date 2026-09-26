import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('the closed cart drawer is not reachable by keyboard/screen reader', () => {
  it('is marked inert by default and has dialog semantics', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/components/CartDrawer.astro'), 'utf-8');
    expect(src, 'missing role="dialog"').toContain('role="dialog"');
    expect(src, 'missing aria-modal="true"').toContain('aria-modal="true"');
    expect(src, 'the drawer is not inert by default').toMatch(/id="cart-drawer"[^>]*\binert\b/);
  });

  it('toggles the inert attribute on open/close', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/components/CartDrawer.astro'), 'utf-8');
    expect(src, 'openDrawer never clears inert').toContain('drawer.inert = false');
    expect(src, 'closeDrawer never sets inert').toContain('drawer.inert = true');
  });

  it('resets to the list view when it closes', async () => {
    const src = await fs.readFile(path.join(process.cwd(), 'src/components/CartDrawer.astro'), 'utf-8');
    const closeDrawerBody = src.slice(src.indexOf('function closeDrawer'), src.indexOf('function closeDrawer') + 400);
    expect(closeDrawerBody, 'closeDrawer does not reset to the list view').toContain('showListView()');
  });
});
