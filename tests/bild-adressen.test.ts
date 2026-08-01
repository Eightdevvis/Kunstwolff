import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { getAllSlidesWithTags } from '../src/utils/slideImages';
import { getSharedSkills } from '../src/utils/skills';

/**
 * Bild-Adressen müssen eine Datei treffen.
 *
 * Der Fall, der das hier ausgelöst hat: Ordnerschlüssel sind teils verschachtelt
 * ("events/hochzeit", "mediathek/somfot"). Wurde so ein Schlüssel am Stück durch
 * encodeURIComponent geschickt, wurde aus dem Trenn-Schrägstrich ein %2F. Das ist
 * laut RFC 3986 KEIN Pfadtrenner, sondern ein Zeichen im Segment – die Adresse
 * trifft dann keine Datei mehr. Der statische Server antwortet mit 500, im Browser
 * bleibt das Bild leer. Betroffen waren 141 Adressen, unter anderem auf /galerie/,
 * /hochzeit/ und /messe/ – also auf indexierbaren Seiten.
 *
 * Auffällig war es nicht, weil die Datei ja existiert: nur der Weg dorthin war falsch
 * geschrieben. Deshalb prüft dieser Test beides – die Schreibweise UND die Datei.
 */

const publicDir = path.resolve('./public');

const zuDateipfad = (src: string): string =>
  path.join(publicDir, decodeURIComponent(src.replace(/^\//, '')));

describe('Bild-Adressen', () => {
  const slides = getAllSlidesWithTags();

  it('es gibt überhaupt Slides zu prüfen', () => {
    expect(slides.length).toBeGreaterThan(0);
  });

  it('keine Slide-Adresse enthält einen kodierten Schrägstrich', () => {
    const kaputt = slides.filter((s) => /%2F/i.test(s.src)).map((s) => s.src);
    expect(kaputt, `%2F trennt keine Pfade – diese Adressen laufen ins Leere:\n${kaputt.join('\n')}`).toEqual([]);
  });

  it('jede Slide-Adresse trifft eine vorhandene Datei', () => {
    const fehlend = slides.filter((s) => !fs.existsSync(zuDateipfad(s.src))).map((s) => s.src);
    expect(fehlend, `Datei nicht gefunden:\n${fehlend.join('\n')}`).toEqual([]);
  });

  it('verschachtelte Ordner behalten ihren echten Trenner', () => {
    // Gegenprobe: ohne verschachtelte Ordner würde der Test oben nichts beweisen.
    const verschachtelt = slides.filter((s) => {
      const rest = s.src.replace(/^\/img\/slides\//, '');
      return rest.split('/').length > 2;
    });
    expect(verschachtelt.length, 'keine verschachtelten Slide-Ordner mehr – Test anpassen').toBeGreaterThan(0);
  });

  /**
   * Die Metadaten schlüsseln auf den Dateinamen. Der Bild-Optimierer macht beim
   * Push aus x.gif ein x.webp – zieht er den Schlüssel nicht mit, zeigt der
   * Eintrag ins Leere. Die Seite rendert dann klaglos weiter, nur mit Standard-
   * werten: der im Admin eingestellte Bildausschnitt und Rahmen sind still weg.
   * Genau so ist "szenenmaler/…kronberg….gif" einmal verloren gegangen.
   */
  it.each([
    ['public/img/slides/slides.meta.json', 'public/img/slides'],
    ['public/img/Titelbild/title.meta.json', 'public/img/Titelbild'],
  ])('kein Eintrag in %s zeigt ins Leere', (metaDatei, wurzel) => {
    const abs = path.resolve(metaDatei);
    if (!fs.existsSync(abs)) return;
    const daten = JSON.parse(fs.readFileSync(abs, 'utf-8')) as Record<string, unknown>;
    const schluessel = Object.keys(daten);
    expect(schluessel.length).toBeGreaterThan(0);
    const verwaist = schluessel.filter((k) => !fs.existsSync(path.resolve(wurzel, k)));
    expect(
      verwaist,
      `Datei fehlt – die dort eingestellten Werte greifen nicht mehr:\n${verwaist.join('\n')}`,
    ).toEqual([]);
  });

  it('Fähigkeiten-Bilder treffen ebenfalls eine Datei', () => {
    const mitBild = getSharedSkills().filter(
      (s) => typeof s.image === 'string' && s.image.startsWith('/img/'),
    );
    expect(mitBild.length).toBeGreaterThan(0);
    const fehlend = mitBild
      .map((s) => s.image as string)
      .filter((src) => /%2F/i.test(src) || !fs.existsSync(zuDateipfad(src)));
    expect(fehlend, `Fähigkeiten-Bild nicht gefunden:\n${fehlend.join('\n')}`).toEqual([]);
  });
});
