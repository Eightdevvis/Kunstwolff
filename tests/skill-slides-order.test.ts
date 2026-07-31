import { describe, expect, it } from 'vitest';
import { getSkillSlidesForCity, matchesSkill, type SlideItem } from '../src/utils/slideImages';

/**
 * B1 aus `reports/tagsystem-audit-2026-07-30.md`, als Test festgenagelt.
 *
 * Vorher lief `supplementWithDefaultSlides` ZUERST und die Slideshow filterte
 * danach über `filteredCategories`. Die Nachfüller wurden damit gleich wieder
 * aussortiert — 93 der 232 Slides und 11 der 30 Auswahl-Slides tragen gar keine
 * `categories`. Ergebnis: 38 von 105 Skill×Stadt-Seiten mit leerer Galerie,
 * obwohl 115 Schnellzeichner-Bilder im Repo liegen.
 *
 * Geprüft wird deshalb nicht „filtert es?", sondern die REIHENFOLGE: nach dem
 * Auffüllen müssen mindestens so viele passende Bilder dastehen wie verlangt,
 * solange es überhaupt genug passende gibt.
 */
const bild = (src: string, categories?: string[]): SlideItem => ({ src, alt: src, categories });
const srcs = (items: SlideItem[]) => items.map((i) => i.src);

describe('getSkillSlidesForCity', () => {
  it('füllt mit Bildern auf, die den Skill AUCH tragen', () => {
    const stadt = [bild('stadt-1', ['Schnellzeichner'])];
    const standard = [
      bild('ohne-kategorie'), // wäre vorher als Füller gelandet und dann rausgeflogen
      bild('passend-1', ['Schnellzeichner']),
      bild('passend-2', ['Schnellzeichner', 'Szenenmaler']),
    ];
    const result = getSkillSlidesForCity(stadt, standard, 'Schnellzeichner', 3);
    expect(srcs(result)).toEqual(['stadt-1', 'passend-1', 'passend-2']);
  });

  it('der Karlsruhe-Fall: eigene Bilder über der Schwelle, aber keins passt', () => {
    // 7 Ortsbilder ohne passende Kategorie → früher kein Auffüllen, danach warf
    // der Filter alle 7 weg und die Seite war LEER.
    const stadt = Array.from({ length: 7 }, (_, i) => bild(`karlsruhe-${i}`, ['Szenenmaler']));
    const standard = Array.from({ length: 8 }, (_, i) => bild(`std-${i}`, ['Schnellzeichner']));
    const result = getSkillSlidesForCity(stadt, standard, 'Schnellzeichner', 6);
    expect(result).toHaveLength(6);
    expect(srcs(result).every((s) => s.startsWith('std-'))).toBe(true);
  });

  it('bleibt leer, wenn es NIRGENDS ein passendes Bild gibt', () => {
    // Der Aquarelle-Fall: kein einziges Bild trägt den Skill. Dann ist leer die
    // Wahrheit – die Sektion wird gar nicht erst gerendert (Leer-Guard, B2).
    const result = getSkillSlidesForCity(
      [bild('a', ['Schnellzeichner'])],
      [bild('b', ['Szenenmaler'])],
      'Aquarelle',
      6,
    );
    expect(result).toEqual([]);
  });

  it('nimmt nie mehr als das Minimum aus den Standardbildern', () => {
    const result = getSkillSlidesForCity(
      [bild('s1', ['Schnellzeichner']), bild('s2', ['Schnellzeichner'])],
      Array.from({ length: 10 }, (_, i) => bild(`std-${i}`, ['Schnellzeichner'])),
      'Schnellzeichner',
      4,
    );
    expect(result).toHaveLength(4);
  });
});

describe('matchesSkill', () => {
  it('vergleicht das Label zeichengenau – wie die Slideshow', () => {
    expect(matchesSkill(bild('a', ['Schnellzeichner']), 'Schnellzeichner')).toBe(true);
    expect(matchesSkill(bild('a', ['schnellzeichner']), 'Schnellzeichner')).toBe(false);
  });

  it('ein Bild ohne categories passt zu keinem Skill', () => {
    // Genau diese 93 von 232 Bildern waren der Grund für die leeren Galerien.
    expect(matchesSkill(bild('a'), 'Schnellzeichner')).toBe(false);
    expect(matchesSkill(bild('a', []), 'Schnellzeichner')).toBe(false);
  });
});
