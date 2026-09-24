import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

describe('Hero wordmark shape stays foreground-colored, not accent-colored', () => {
  it('the decorative svg sets its own text-foreground instead of inheriting the h1\'s text-accent', async () => {
    // The shape/confetti use fill="currentColor". Without an explicit
    // color on the <svg> itself, currentColor resolves to the enclosing
    // <h1>'s text-accent — turning the shape lilac/purple in dark mode
    // instead of staying the original white (reported live: "el cursor
    // era blanco, ¿por qué cambió de color en dark mode?").
    const src = await fs.readFile(path.join(process.cwd(), 'src/components/Hero.astro'), 'utf-8');
    const svgMatch = src.match(/<svg[^>]*>/);
    expect(svgMatch, 'could not find the decorative <svg>').not.toBeNull();
    expect(svgMatch![0], 'the <svg> is missing text-foreground').toContain('text-foreground');
  });
});
