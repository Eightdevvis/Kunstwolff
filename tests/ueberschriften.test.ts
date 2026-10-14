import fs from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHomeHeading, getLandingHeading, getSiteTexts, SITE_TEXT_DEFAULTS } from '../src/utils/siteTexts';

// Überschriften leben in site-texts/content.json (wie die Fließtexte). Fehlt ein
// Eintrag oder ist er leer, bleibt der bisherige Text – eine H1/H2 darf nie leer sein.
const mitInhalt = (json: unknown) =>
  vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(json) as never);

afterEach(() => vi.restoreAllMocks());

describe('Überschriften aus site-texts/content.json', () => {
  it('ohne Einträge bleiben die bisherigen Texte', () => {
    mitInhalt({});
    expect(getHomeHeading()).toBe('Event- und Showkünstler seit über 25 Jahren');
    expect(getSiteTexts().slideshow.heading).toBe('Unsere Kunst');
    expect(getSiteTexts().faq.heading).toBe('Häufige Fragen (FAQ)');
    expect(getLandingHeading('berlin', 'Eventkünstler in Berlin', undefined, 'Berlin')).toBe('Eventkünstler in Berlin');
  });

  it('eigene Werte gewinnen, leere zählen nicht', () => {
    mitInhalt({
      slideshow: { heading: 'Unsere Bilder' },
      faq: { heading: '   ' },
      landingHeadings: { _home: 'Kunst live', berlin: 'Schnellzeichner Berlin', _default: 'Live-Kunst in {stadt}' },
    });
    expect(getHomeHeading()).toBe('Kunst live');
    expect(getSiteTexts().slideshow.heading).toBe('Unsere Bilder');
    expect(getSiteTexts().faq.heading).toBe(SITE_TEXT_DEFAULTS.faq.heading);
    expect(getLandingHeading('berlin', 'x', undefined, 'Berlin')).toBe('Schnellzeichner Berlin');
    // Stadt ohne eigenen Eintrag: Standard mit eingesetztem Stadtnamen.
    expect(getLandingHeading('mainz', 'x', undefined, 'Mainz')).toBe('Live-Kunst in Mainz');
  });
});
