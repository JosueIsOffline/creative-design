import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const CSS_PATH = path.join(process.cwd(), 'src', 'styles', 'global.css');

describe('theme tokens in global.css', () => {
  it('defines the semantic color tokens Tailwind needs', async () => {
    const css = await fs.readFile(CSS_PATH, 'utf-8');
    for (const token of [
      '--color-background: var(--background)',
      '--color-foreground: var(--foreground)',
      '--color-surface: var(--surface)',
      '--color-border: var(--border)',
      '--color-border-strong: var(--border-strong)',
      '--color-muted: var(--muted)',
      '--color-subtle: var(--subtle)',
      '--color-accent: var(--accent)',
    ]) {
      expect(css).toContain(token);
    }
  });

  it('defines a light override keyed on data-theme', async () => {
    const css = await fs.readFile(CSS_PATH, 'utf-8');
    expect(css).toContain(':root[data-theme="light"]');
    expect(css).toContain('oklch(0.96 0.0057 308.39)');
  });

  it('keeps the dark tokens pinned to today\'s literal brand values', async () => {
    const css = await fs.readFile(CSS_PATH, 'utf-8');
    expect(css).toContain('--background: #0d0d0c');
    expect(css).toContain('--surface: #1a1a1a');
  });

  it('keeps the fixed brand-black/brand-lilac fill colors available', async () => {
    const css = await fs.readFile(CSS_PATH, 'utf-8');
    expect(css).toContain('--color-brand-black: #0d0d0c');
    expect(css).toContain('--color-brand-lilac: #d9a8d9');
  });

  it('removes the unused brand-orange/pink/purple tokens', async () => {
    const css = await fs.readFile(CSS_PATH, 'utf-8');
    expect(css).not.toContain('brand-orange');
    expect(css).not.toContain('brand-pink');
    expect(css).not.toContain('brand-purple');
  });
});
