import { describe, expect, it } from 'vitest';
import { erzeugeVorladefenster, liegtNahe, type LadbaresBild } from '../src/scripts/slideVorladen';

/**
 * Der Prüfling ist die Reihenfolge-Logik des Vorladefensters, nicht der
 * Browser. Ein „Bild" ist hier alles, was `wartend` + `freigeben()` kann —
 * genau das braucht die Logik, und genau deshalb ist sie ohne DOM prüfbar.
 */
type TestBild = LadbaresBild & { wartend: boolean; aufrufe: number };
const bild = (wartend = true): TestBild => ({
  wartend,
  aufrufe: 0,
  freigeben() {
    this.aufrufe++;
    this.wartend = false;
  },
});
const bilder = (anzahl: number): TestBild[] => Array.from({ length: anzahl }, () => bild());

const geladen = (liste: TestBild[]) => liste.map((b) => (b.wartend ? 0 : 1)).join('');

describe('erzeugeVorladefenster', () => {
  it('gibt beim Öffnen den ersten Slide samt Vorlauf frei', () => {
    const liste = bilder(10);
    const fenster = erzeugeVorladefenster(liste, 3);

    expect(fenster.bisSlide(0)).toBe(4);
    // Slide 0 plus drei Vorlauf – der Rest wartet.
    expect(geladen(liste)).toBe('1111000000');
  });

  it('läuft dem Autoplay voraus, statt ihm nachzulaufen', () => {
    const liste = bilder(10);
    const fenster = erzeugeVorladefenster(liste, 3);

    fenster.bisSlide(0);
    fenster.bisSlide(1); // Autoplay steht auf 1 …
    expect(liste[4].wartend).toBe(false); // … Slide 4 ist schon unterwegs

    fenster.bisSlide(2);
    expect(liste[5].wartend).toBe(false);
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

  it('lässt ein schon freigegebenes Bild in Ruhe', () => {
    // z. B. von liegtNahe() freigegeben, bevor das Fenster dort ankam
    const liste = [bild(false), bild(), bild()];
    const fenster = erzeugeVorladefenster(liste, 1);

    // Nur die beiden wartenden Bilder zählen als neu freigegeben.
    expect(fenster.bisSlide(0)).toBe(1);
    expect(fenster.bisSlide(1)).toBe(1);
    expect(liste[0].aufrufe).toBe(0);
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

describe('liegtNahe', () => {
  const buehne = { left: 0, right: 400 };

  it('erkennt ein Slide auf der Bühne', () => {
    expect(liegtNahe({ left: 100, right: 300 }, buehne, 0)).toBe(true);
  });

  it('erkennt ein halb hereinragendes Slide', () => {
    expect(liegtNahe({ left: 390, right: 700 }, buehne, 0)).toBe(true);
    expect(liegtNahe({ left: -200, right: 10 }, buehne, 0)).toBe(true);
  });

  it('nimmt den Vorlauf in BEIDE Richtungen dazu', () => {
    // rechts: der nächste Autoplay-Schritt; links: Rückwärtswischen im Loop
    expect(liegtNahe({ left: 700, right: 900 }, buehne, 400)).toBe(true);
    expect(liegtNahe({ left: -500, right: -300 }, buehne, 400)).toBe(true);
  });

  it('lässt weit entfernte Slides warten', () => {
    expect(liegtNahe({ left: 900, right: 1200 }, buehne, 400)).toBe(false);
    expect(liegtNahe({ left: -1200, right: -900 }, buehne, 400)).toBe(false);
  });
});
