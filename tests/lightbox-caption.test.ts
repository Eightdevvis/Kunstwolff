import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Die Bildunterschrift zeigt NUR den gepflegten Titel.
 *
 * Vorher lautete die Regel `slide.title || slide.alt` — und `alt` wird aus dem
 * DATEINAMEN abgeleitet (`normalizeAlt`: Endung weg, führende Nummer weg,
 * Unterstriche zu Leerzeichen). Unter jedem Bild stand damit technischer
 * Dateikram wie „2 kollegen weihnachtsfeier trier", den niemand lesen soll.
 *
 * Geprüft wird die Quelle statt des Verhaltens, weil die Lightbox ohne DOM
 * nicht läuft (das Repo hat bewusst kein Browser-Test-Setup). Der Test hält
 * damit genau die eine Entscheidung fest, die leicht wieder zurückrutscht:
 * kein Rückfall auf `alt`.
 */
const quelle = fs.readFileSync(path.resolve('./src/scripts/lightbox.ts'), 'utf-8');

describe('Lightbox-Unterschrift', () => {
  it('fällt NICHT auf den Alt-Text zurück', () => {
    expect(quelle).not.toContain('slide.title || slide.alt');
  });

  it('nutzt den gepflegten Titel', () => {
    expect(quelle).toContain('slide.title');
  });

  it('behält den Alt-Text am Bild selbst (Screenreader)', () => {
    // Der Dateiname-Text ist als Alternativtext weiterhin richtig – nur eben
    // nicht sichtbar. Verschwindet diese Zeile, ist das ein A11y-Rückschritt.
    expect(quelle).toContain('lbImg.alt = slide.alt');
  });
});
