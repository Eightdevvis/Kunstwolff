import { describe, it, expect } from 'vitest';
// @ts-expect-error – reines JS-Modul ohne Typen
import { ergaenzeFehlendeDimensionen, findeTagsBlock } from '../scripts/tags.mjs';

/**
 * Der Unterschied, um den es hier geht: „nicht gesetzt" ist nicht dasselbe wie
 * „bewusst leer".
 *
 * Bis 2026-08-01 prüften `sync-faq-tags.mjs` und `sync-reviews-tags.mjs` nur, OB
 * ein `tags:`-Block existiert. Schrieb der Admin einen halben Block – nur
 * `skills`, kein `landings` –, war die Ergänzung damit dauerhaft abgeschaltet.
 * Der Ordner-Tag kam nie nach, und weil eine fehlende Dimension „gilt überall"
 * bedeutet, wanderte eine Stadt-FAQ still auf sämtliche Seiten.
 */

const fm = (zeilen: string[]) => `${zeilen.join('\n')}\n`;

describe('findeTagsBlock', () => {
  it('unterscheidet vorhandene von fehlenden Dimensionen', () => {
    const block = findeTagsBlock(
      fm(['question: "X"', 'tags:', '  skills:', '    - schnellzeichner', '  events: []']),
    );
    expect([...block.vorhanden].sort()).toEqual(['events', 'skills']);
  });

  it('gibt null zurück, wenn es gar keinen Block gibt', () => {
    expect(findeTagsBlock(fm(['question: "X"', 'categories:', '  - Schnellzeichner']))).toBeNull();
  });

  it('lässt die Flow-Form in Ruhe – zeilenweise ergänzen ginge dort nicht', () => {
    expect(findeTagsBlock(fm(['tags: { skills: [a] }']))).toBeNull();
    expect(findeTagsBlock(fm(['tags: []']))).toBeNull();
  });
});

describe('ergaenzeFehlendeDimensionen', () => {
  it('trägt die fehlende Dimension nach – der Fall aus faq/bw/', () => {
    const vorher = fm([
      'question: "Wie kann ich einen Event-Karikaturisten buchen?"',
      'categories:',
      '  - Schnellzeichner',
      'tags:',
      '  skills:',
      '    - schnellzeichner',
    ]);

    const nachher = ergaenzeFehlendeDimensionen(vorher, {
      skills: ['schnellzeichner'],
      events: [],
      landings: ['bw'],
    });

    expect(nachher).toContain('  landings:\n    - bw');
    expect(nachher).toContain('  events: []');
    // Der bestehende Teil bleibt unverändert stehen.
    expect(nachher).toContain('  skills:\n    - schnellzeichner');
    // Und nichts rutscht hinter das Frontmatter.
    expect(nachher!.endsWith('\n')).toBe(true);
  });

  it('fasst ein ausdrücklich leeres `landings: []` NICHT an', () => {
    // Das ist eine Entscheidung („gilt überall"), keine Lücke – sonst könnte
    // niemand eine Stadt-FAQ je allgemein machen.
    const vorher = fm(['tags:', '  skills: []', '  events: []', '  landings: []']);
    expect(ergaenzeFehlendeDimensionen(vorher, { skills: [], events: [], landings: ['bw'] })).toBeNull();
  });

  it('meldet nichts zu tun, wenn alle drei Dimensionen dastehen', () => {
    const vorher = fm(['tags:', '  skills:', '    - a', '  events:', '    - messe', '  landings:', '    - berlin']);
    expect(ergaenzeFehlendeDimensionen(vorher, { skills: [], events: [], landings: [] })).toBeNull();
  });

  it('rührt Felder hinter dem Tag-Block nicht an', () => {
    const vorher = fm(['tags:', '  skills:', '    - a', 'rating: 5']);
    const nachher = ergaenzeFehlendeDimensionen(vorher, { skills: [], events: [], landings: ['bw'] });
    expect(nachher).toBe(
      fm(['tags:', '  skills:', '    - a', '  events: []', '  landings:', '    - bw', 'rating: 5']),
    );
  });
});
