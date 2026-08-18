import { describe, expect, it } from 'vitest';
import { erzeugeVorladefenster, type LadbaresBild } from '../src/scripts/slideVorladen';

/**
 * Der Prüfling ist die Reihenfolge-Logik des Vorladefensters, nicht der
 * Browser. Ein „Bild" ist hier alles, was ein `loading` trägt — genau das
 * braucht die Logik, und genau deshalb ist sie ohne DOM prüfbar.
 */
const bilder = (anzahl: number): LadbaresBild[] =>
  Array.from({ length: anzahl }, () => ({ loading: 'lazy' }));

const geladen = (liste: LadbaresBild[]) =>
  liste.map((b) => (b.loading === 'eager' ? 1 : 0)).join('');

describe('erzeugeVorladefenster', () => {
  it('gibt beim Öffnen den ersten Slide samt Vorlauf frei', () => {
    const liste = bilder(10);
    const fenster = erzeugeVorladefenster(liste, 3);

    expect(fenster.bisSlide(0)).toBe(4);
    // Slide 0 plus drei Vorlauf – der Rest bleibt lazy.
    expect(geladen(liste)).toBe('1111000000');
  });

  it('läuft dem Autoplay voraus, statt ihm nachzulaufen', () => {
    const liste = bilder(10);
    const fenster = erzeugeVorladefenster(liste, 3);

    fenster.bisSlide(0);
    fenster.bisSlide(1); // Autoplay steht auf 1 …
    expect(liste[4].loading).toBe('eager'); // … Slide 4 ist schon unterwegs

    fenster.bisSlide(2);
    expect(liste[5].loading).toBe('eager');
  });

  it('schaltet jedes Bild nur ein einziges Mal um', () => {
    const liste = bilder(10);
    const fenster = erzeugeVorladefenster(liste, 3);

    expect(fenster.bisSlide(0)).toBe(4);
    expect(fenster.bisSlide(0)).toBe(0); // nichts Neues
    expect(fenster.bisSlide(1)).toBe(1); // genau ein weiteres
  });

  it('fällt nicht zurück, wenn der Loop wieder bei 0 anfängt', () => {
    // Der eigentliche Grund für die Monotonie: `realIndex` springt im
    // Loop-Modus von der letzten Position zurück auf 0. Ohne sie würde das
    // Fenster bei jedem Durchlauf von vorn beginnen.
    const liste = bilder(10);
    const fenster = erzeugeVorladefenster(liste, 3);

    fenster.bisSlide(6);
    expect(fenster.stand).toBe(9);

    expect(fenster.bisSlide(0)).toBe(0);
    expect(fenster.stand).toBe(9);
    expect(geladen(liste)).toBe('1111111111');
  });

  it('läuft am Ende der Liste nicht über', () => {
    const liste = bilder(3);
    const fenster = erzeugeVorladefenster(liste, 3);

    expect(() => fenster.bisSlide(2)).not.toThrow();
    expect(fenster.stand).toBe(2);
    expect(geladen(liste)).toBe('111');
  });

  it('lässt ein bereits eager geladenes Bild in Ruhe', () => {
    const liste: LadbaresBild[] = [
      { loading: 'eager' },
      { loading: 'lazy' },
      { loading: 'lazy' },
    ];
    const fenster = erzeugeVorladefenster(liste, 1);

    // Nur die beiden lazy-Bilder zählen als neu freigegeben.
    expect(fenster.bisSlide(0)).toBe(1);
    expect(fenster.bisSlide(1)).toBe(1);
  });

  it('verträgt einen negativen Index, ohne rückwärts zu laufen', () => {
    const liste = bilder(5);
    const fenster = erzeugeVorladefenster(liste, 2);

    fenster.bisSlide(2);
    expect(fenster.stand).toBe(4);
    expect(fenster.bisSlide(-1)).toBe(0);
    expect(fenster.stand).toBe(4);
  });

  it('gibt ohne Bilder nichts frei und stürzt nicht ab', () => {
    const fenster = erzeugeVorladefenster([], 3);
    expect(fenster.bisSlide(0)).toBe(0);
    expect(fenster.stand).toBe(-1);
  });
});
