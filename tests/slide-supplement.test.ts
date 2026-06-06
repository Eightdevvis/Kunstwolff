import { describe, expect, it } from 'vitest';
import { supplementWithDefaultSlides, type SlideItem } from '../src/utils/slideImages';

// P4-1: Kern-Logik der Slide-Zusammenstellung (supplement / dedup / order) –
// die zerbrechlichste, vom Audit markierte Stelle, bisher ungetestet.

const s = (src: string): SlideItem => ({ src, alt: src });
const srcs = (items: SlideItem[]) => items.map((i) => i.src);

describe('supplementWithDefaultSlides (P4-1)', () => {
  it('füllt nicht auf, wenn genug Stadt-Slides vorhanden sind', () => {
    const result = supplementWithDefaultSlides([s('a'), s('b'), s('c')], [s('x'), s('y')], 3);
    expect(srcs(result)).toEqual(['a', 'b', 'c']);
  });

  it('füllt mit Default-Slides bis zum Minimum auf – Stadt-Slides zuerst', () => {
    const result = supplementWithDefaultSlides([s('a')], [s('x'), s('y'), s('z')], 3);
    expect(srcs(result)).toEqual(['a', 'x', 'y']);
  });

  it('dedupliziert nach src über Stadt+Default (Stadt gewinnt, Reihenfolge bleibt)', () => {
    const result = supplementWithDefaultSlides([s('a'), s('b')], [s('b'), s('c')], 4);
    expect(srcs(result)).toEqual(['a', 'b', 'c']); // b nur einmal
  });

  it('dedupliziert auch rein innerhalb der Stadt-Slides', () => {
    const result = supplementWithDefaultSlides([s('a'), s('a'), s('b')], [], 5);
    expect(srcs(result)).toEqual(['a', 'b']);
  });

  it('kommt mit leeren Eingaben klar', () => {
    expect(supplementWithDefaultSlides([], [], 6)).toEqual([]);
  });
});
