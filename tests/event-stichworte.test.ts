import { describe, it, expect } from 'vitest';
import fs from 'fs';
// @ts-expect-error - reines JS-Modul ohne Typen
import { EVENT_KEYWORDS, inferEventsFromKey, slugSet } from '../scripts/tags.mjs';

describe('Anlass-Ableitung trifft an Wortgrenzen', () => {
  it('erfindet keinen Anlass mitten im Wort', () => {
    // Der reine Substring-Test war produktiv im Einsatz: "angemessen" enthaelt
    // "messe", "gemessen" auch. Beide wurden zu Messe-Bildern bzw. -Reviews.
    expect(inferEventsFromKey('trier/angemessen-preis.webp')).toEqual([]);
    expect(inferEventsFromKey('trier/unangemessen.webp')).toEqual([]);
  });

  it('trifft weiterhin am Wortanfang', () => {
    expect(inferEventsFromKey('trier/hochzeit-karikatur.webp')).toEqual(['hochzeit']);
    expect(inferEventsFromKey('koeln/weihnachtsfeier-2024.webp')).toEqual(['weihnachtsfeier']);
    expect(inferEventsFromKey('events/messe/stand.webp')).toEqual(['messe']);
  });

  it('jeder Stichwort-Schluessel existiert auch im Vokabular', () => {
    // `jubilaum` war der einzige von zwoelf, den tags.json nicht kennt
    // (dort heisst er `jubilaeum`) – ein so vergebener Tag traf nie eine Seite.
    const vokabular = slugSet(
      JSON.parse(fs.readFileSync('public/config/tags.json', 'utf-8')).events,
    );
    const unbekannt = Object.keys(EVENT_KEYWORDS).filter((slug) => !vokabular.has(slug));
    expect(unbekannt).toEqual([]);
  });
});
