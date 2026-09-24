import { describe, it, expect } from 'vitest';
import { resolveTheme } from '../src/scripts/theme';

describe('resolveTheme', () => {
  it('uses the stored preference when it is a valid theme', () => {
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', true)).toBe('dark');
  });

  it('falls back to the system preference when nothing is stored', () => {
    expect(resolveTheme(null, true)).toBe('light');
    expect(resolveTheme(null, false)).toBe('dark');
  });

  it('falls back to the system preference when the stored value is invalid', () => {
    expect(resolveTheme('sepia', true)).toBe('light');
    expect(resolveTheme('', false)).toBe('dark');
  });
});
