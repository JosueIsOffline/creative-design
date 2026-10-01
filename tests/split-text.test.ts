import { describe, it, expect } from 'vitest';
import { wordsOf } from '../src/scripts/split-text';

describe('wordsOf', () => {
  it('splits text into words', () => {
    expect(wordsOf('Creative Design')).toEqual(['Creative', 'Design']);
  });

  it('collapses multiple spaces and trims', () => {
    expect(wordsOf('  Diseño  gráfico   personalizado  ')).toEqual(['Diseño', 'gráfico', 'personalizado']);
  });

  it('handles accented characters correctly', () => {
    expect(wordsOf('Diseño gráfico y sublimación')).toEqual(['Diseño', 'gráfico', 'y', 'sublimación']);
  });

  it('returns an empty array for empty or whitespace-only input', () => {
    expect(wordsOf('')).toEqual([]);
    expect(wordsOf('   ')).toEqual([]);
  });
});
