import { describe, expect, it } from 'vitest';
import { metaDescription, pageTitle } from '../src/utils/seoSnippet';

describe('metaDescription', () => {
  it('lässt kurze Texte unverändert (bis auf Leerraum)', () => {
    expect(metaDescription('  Kurz und\n gut. ')).toBe('Kurz und gut.');
  });

  it('kürzt auf ganze Sätze, wenn die lang genug sind', () => {
    const t =
      'Ein Event-Zeichner als Graphic Recorder übersetzt gesprochene Inhalte live vor Ort oder digital in eine visuelle Landkarte aus Bildern, Metaphern und kurzen Texten. Er ist live auf Ihrem Meeting.';
    const m = metaDescription(t);
    expect(m.length).toBeLessThanOrEqual(155);
    expect(m.endsWith('.') || m.endsWith('…')).toBe(true);
  });

  it('schneidet sonst am Wortende mit Auslassungszeichen', () => {
    const t =
      'Schnell-Porträts für Geburtstage, Jubiläen und private Feiern. Ein Schnellzeichner oder Szenenmaler sorgt für lockere Stimmung und individuelle Erinnerungen.';
    const m = metaDescription(t);
    expect(m.length).toBeLessThanOrEqual(155);
    expect(m.endsWith('…')).toBe(true);
    expect(m).not.toMatch(/\s…$/);
  });
});

describe('pageTitle', () => {
  it('hängt die Marke an, wenn es passt', () => {
    expect(pageTitle('Schnellzeichner Berlin – Live-Kunst')).toBe('Schnellzeichner Berlin – Live-Kunst | Kunstwolff');
  });

  it('kürzt am Gedankenstrich statt mitten im Wort', () => {
    expect(pageTitle('Schnellzeichner Karikaturisten Saarbrücken – Live-Kunst')).toBe(
      'Schnellzeichner Karikaturisten Saarbrücken | Kunstwolff',
    );
    expect(pageTitle('Live-Zeichnungen für Ihre private Feier - ein großer Spaß für Alt und Jung!')).toBe(
      'Live-Zeichnungen für Ihre private Feier | Kunstwolff',
    );
  });

  it('lässt die Marke weg, wenn nur so der Titel passt', () => {
    expect(pageTitle('Spaß für Ihre Mitarbeiter auf der Weihnachtsfeier')).toBe(
      'Spaß für Ihre Mitarbeiter auf der Weihnachtsfeier',
    );
  });
});
