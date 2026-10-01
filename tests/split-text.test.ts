import { describe, it, expect } from 'vitest';
import { wordsOf, charsOf } from '../src/scripts/split-text';

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

describe('charsOf', () => {
  it('splits a word into individual characters', () => {
    expect(charsOf('hola')).toEqual(['h', 'o', 'l', 'a']);
  });

  it('handles accented characters as single units', () => {
    expect(charsOf('ñoño')).toEqual(['ñ', 'o', 'ñ', 'o']);
  });

  it('returns an empty array for an empty string', () => {
    expect(charsOf('')).toEqual([]);
  });
});
