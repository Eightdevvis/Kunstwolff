import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, PREFIXED_LOCALES, localizePath } from '../src/i18n/config';

/**
 * `localizePath` baut Adressen, die auch in strukturierten Daten landen.
 *
 * Der Fall: die Vorlage war `` `/${slug}/` `` — bei leerem Slug also `//`.
 * Genau so stand es im Breadcrumb-Schema der FR-Seite: der Krümel „Accueil"
 * zeigte auf `https://kunstwolff.de//`. Ein Browser verzeiht das, Google nicht:
 * dort ist es eine Adresse, die es nicht gibt, in genau den Daten, die über
 * die Darstellung im Suchergebnis entscheiden.
 *
 * Aufgefallen ist es erst, als die Adressen IN den JSON-LD-Blöcken gegen den
 * gebauten Stand geprüft wurden — die HTML-Links waren alle in Ordnung.
 */
describe('localizePath', () => {
  it('deutsche Seiten bleiben ohne Präfix', () => {
    expect(localizePath(DEFAULT_LOCALE, 'berlin')).toBe('/berlin/');
  });

  it('übersetzte Seiten bekommen ihr Präfix', () => {
    expect(localizePath('fr', 'belgique')).toBe('/fr/belgique/');
  });

  it('leerer Slug ist die Wurzel der Sprache, kein doppelter Schrägstrich', () => {
    expect(localizePath(DEFAULT_LOCALE, '')).toBe('/');
    expect(localizePath('fr', '')).toBe('/fr/');
  });

  it('verträgt Schrägstriche im Slug, ohne sie zu verdoppeln', () => {
    expect(localizePath(DEFAULT_LOCALE, '/berlin/')).toBe('/berlin/');
    expect(localizePath('fr', '/belgique')).toBe('/fr/belgique/');
  });

  it('keine Locale erzeugt jemals einen doppelten Schrägstrich', () => {
    const eingaben = ['', '/', 'berlin', '/berlin', 'berlin/', '//berlin//'];
    for (const locale of LOCALES) {
      for (const slug of eingaben) {
        const pfad = localizePath(locale, slug);
        expect(pfad, `${locale} + ${JSON.stringify(slug)} → ${pfad}`).not.toMatch(/\/\//);
        expect(pfad.startsWith('/')).toBe(true);
        expect(pfad.endsWith('/')).toBe(true);
      }
    }
  });

  it('jede übersetzte Sprache hat ihr eigenes Präfix', () => {
    expect(PREFIXED_LOCALES.length).toBeGreaterThan(0);
    for (const locale of PREFIXED_LOCALES) {
      expect(localizePath(locale, 'x')).toBe(`/${locale}/x/`);
    }
  });
});
